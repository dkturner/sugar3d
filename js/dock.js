'use strict';

angular.module('Sugar')

.controller('DockAreaCtrl', [ '$scope', '$element', '$document',
function ($scope, $element, $document) {
    function handleMove(event) {
        var dx = event.screenX - resize.x0;
        var dy = event.screenY - resize.y0;
        if (resize.side == 'left' || resize.side == 'right')
            dy = 0;
        else
            dx = 0;
        resize.handle.offset({
            left: resize.offset0.left + dx,
            top: resize.offset0.top + dy
        });
        event.preventDefault();
        event.stopPropagation();
    }
    function handleMouseUp(event) {
        var dx = event.screenX - resize.x0;
        var dy = event.screenY - resize.y0;
        if (resize.side == 'left')
            resize.panel.width(resize.panel.width() - dx);
        else if (resize.side == 'right')
            resize.panel.width(resize.panel.width() + dx);
        else if (resize.side == 'top')
            resize.panel.height(resize.panel.height() - dy);
        else if (resize.side == 'bottom')
            resize.panel.height(resize.panel.height() + dy);
        requireLayout();
        resize.overlay.remove();
        resize.handle.removeClass('dragging');
        resize.handle.removeAttr('style');
        $document.off('mousemove', handleMove);
        $document.off('mouseup', handleMouseUp);
        event.preventDefault();
        event.stopPropagation();
    }
    function buildLayout() {
        var fills = [];
        var top = 0;
        var left = 0;
        var right = 0;
        var bottom = 0;
        var dockWidth = $element.width();
        var dockHeight = $element.height();
        layout = Object.create(null);
        for (var i = 0; i < panels.length; ++ i) {
            var panel = angular.element(panels[i]);
            var dock = panel.attr('dock');
            var width = parseFloat(panel.css('width'));
            var height = parseFloat(panel.css('height'));
            var pos = {};
            switch (dock) {
                case 'fill':
                default:
                    fills.push(panel);
                    continue;
                case 'left':
                    pos.left = left;
                    pos.top = top;
                    pos.bottom = bottom;
                    pos.width = width || dockWidth / 6;
                    left += pos.width;
                    break;
                case 'top':
                    pos.top = top;
                    pos.left = left;
                    pos.right = right;
                    pos.height = height || dockHeight / 8;
                    top += pos.height;
                    break;
                case 'right':
                    pos.top = top;
                    pos.right = right;
                    pos.bottom = bottom;
                    pos.width = width || dockWidth / 6;
                    right += pos.width;
                    break;
                case 'bottom':
                    pos.left = left;
                    pos.right = right;
                    pos.bottom = bottom;
                    pos.height = height || dockHeight / 8;
                    bottom += pos.height;
                    break;
            }
            layout[panel.data('__dock_id')] = pos;
        }
        if (fills.length > 1) {
            if (!fillTabContainer) {
                fillTabContainer = angular.element('<div dock-tabset>');
                $element.append(fillTabContainer);
            }
            fillTabContainer.append(fills);
        } else {
            if (fillTabContainer) {
                $element.append(fillTabContainer.children());
                fillTabContainer.remove();
                fillTabContainer = null;
            }
            if (fills.length == 1) {
                layout[fills[0].data('__dock_id')] = {
                    left: left,
                    top: top,
                    right: right,
                    bottom: bottom
                };
            }
        }
        fillArea = {
            left: left,
            top: top,
            right: right,
            bottom: bottom
        };
    }
    function requireLayout() {
        layout = null;
        $scope.$broadcast('dockLayout');
    }
    function beginDrag(event) {
        if (event.originalEvent.dataTransfer.types.indexOf('text/x-dock-panel-id') >= 0) {
            event.originalEvent.dataTransfer.dropEffect = 'move';
            if (!dropHint) {
                $element.addClass('drop-target');
                dropHint = angular.element('<div class="dock-drop-hint">');
                $element.append(dropHint);
            }
            return true;
        }
        return false;
    }
    function endDrag() {
        if (dropHint) {
            $element.removeClass('drop-target');
            dropHint.remove();
            dropHint = null;
        }
    }
    function dragEnter(event) {
        if (beginDrag(event))
            event.preventDefault();
    }
    function dragOver(event) {
        if (!beginDrag(event))
            return;
        var w = $element.width();
        var h = $element.height();
        var x = event.originalEvent.clientX;
        var y = event.originalEvent.clientY;
        if (x >= fillArea.left && (w - x) >= fillArea.right
        && y >= fillArea.top && (h - y) >= fillArea.bottom) {
            var thresholdX = Math.min(400, (w - fillArea.left - fillArea.right) / 4);
            var thresholdY = Math.min(200, (h - fillArea.top - fillArea.bottom) / 4);
            if (x - fillArea.left < thresholdX) {
                dropPosition = {
                    dock: 'left',
                    listPos: 'end',
                    width: thresholdX
                };
                dropHint.css('left', fillArea.left + 'px');
                dropHint.css('top', fillArea.top + 'px');
                dropHint.css('width', thresholdX + 'px');
                dropHint.css('height', (h - fillArea.bottom - fillArea.top) + 'px');
            } else if (x > w - fillArea.right - thresholdX) {
                dropPosition = {
                    dock: 'right',
                    listPos: 'end',
                    width: thresholdX
                };
                dropHint.css('left', (w - fillArea.right - thresholdX) + 'px');
                dropHint.css('top', fillArea.top + 'px');
                dropHint.css('width', thresholdX + 'px');
                dropHint.css('height', (h - fillArea.bottom - fillArea.top) + 'px');
            } else if (y - fillArea.top < thresholdY) {
                dropPosition = {
                    dock: 'top',
                    listPos: 'end',
                    height: thresholdY
                };
                dropHint.css('left', fillArea.left + 'px');
                dropHint.css('top', fillArea.top + 'px');
                dropHint.css('width', (w - fillArea.right - fillArea.left) + 'px');
                dropHint.css('height', thresholdY + 'px');
            } else if (y > h - fillArea.bottom - thresholdY) {
                dropPosition = {
                    dock: 'bottom',
                    listPos: 'end',
                    height: thresholdY
                };
                dropHint.css('left', fillArea.left + 'px');
                dropHint.css('top', (h - fillArea.bottom - thresholdY) + 'px');
                dropHint.css('width', (w - fillArea.right - fillArea.left) + 'px');
                dropHint.css('height', thresholdY + 'px');
            } else {
                dropPosition = {
                    dock: 'fill',
                    listPos: 'end',
                };
                dropHint.css('left', fillArea.left + 'px');
                dropHint.css('top', fillArea.top + 'px');
                dropHint.css('width', (w - fillArea.right - fillArea.left) + 'px');
                dropHint.css('height', (h - fillArea.top - fillArea.bottom) + 'px');
            }
        } else {
            // drop over an existing panel, not yet handled...
            dropPosition = null;
            dropHint.css('width', '0px');
            dropHint.css('height', '0px');
        }
        event.preventDefault();
    }
    function dragLeave(event) {
        endDrag();
    }
    function drop(event) {
        endDrag();
        var id = event.originalEvent.dataTransfer.getData('text/x-dock-panel-id');
        var panel = me.findDragPanel(id);
        if (panel.parent().parent()[0] != $element[0]) {
            panel.parent().parent().scope().removePanel(panel);
            me.addPanel(panel, dropPosition);
            $element.append(panel);
        } else {
            me.movePanel(panel, dropPosition);
        }
        event.preventDefault();
    }
    var me = this;
    var nextId = 0;
    var panels = [];
    var fillTabContainer = null;
    var tabContainerPanels = [];
    var dropHint = null;
    var dropPosition = null;
    var layout = null;
    var fillArea = {};
    var resize;
    var myUniqueId = (Math.random() * 0xffff) & 0xffff;
    $element.on('dragenter', dragEnter);
    $element.on('dragover', dragOver);
    $element.on('dragleave', dragLeave);
    $element.on('drop dragdrop', drop);
    this.addPanel = function (panel, defaultDock) {
        panel.data('__dock_id', nextId++);
        panels.push(panel[0]);
        requireLayout();
    }
    this.removePanel = function (panel) {
        panels.splice(panels.indexOf(panel[0]), 1);
        requireLayout();
    }
    this.movePanel = function (panel, pos) {
        if (!pos)
            return;
        if (pos.dock)
            panel.attr('dock', pos.dock);
        if (pos.listPos) {
            panels.splice(panels.indexOf(panel[0]), 1);
            if (pos.listPos == 'end')
                panels.push(panel[0]);
            else
                panels.unshift(panel[0]);
        }
        if (pos.width)
            panel.width(pos.width);
        if (pos.height)
            panel.height(pos.height);
        requireLayout();
    }
    this.getPosition = function(panel) {
        if (!layout)
            buildLayout();
        return layout[panel.data('__dock_id')];
    }
    this.beginResize = function (event, panel, handle, side) {
        resize = {
            panel: panel,
            handle: handle,
            side: side,
            x0: event.screenX,
            y0: event.screenY,
            offset0: handle.offset(),
            overlay: angular.element(
                '<div style="position:absolute;top:0;bottom:0;left:0;right:0;background(0,0,0,0);z-index:9999">')
        };
        resize.overlay.css('cursor', handle.css('cursor'));
        angular.element('body').append(resize.overlay);
        handle.addClass('dragging');
        handle.css('z-index', '9999');
        $document.on('mousemove', handleMove);
        $document.on('mouseup', handleMouseUp);
    }
    this.getDragId = function (panel) {
        var id = panel.attr('id');
        if (id)
            return '#' + id;
        id = $element.attr('id');
        if (id)
            return '#' + id + '(' + panel.data('__dock_id') + ')';
        return myUniqueId + '(' + panel.data('__dock_id') + ')';
    }
    this.getPanelById = function (id) {
        for (var i = 0; i < panels.length; ++ i) {
            var panel = angular.element(panels[i]);
            if (panel.data('__dock_id') == +id)
                return panel;
        }
        return null;
    }
    this.findDragPanel = function (id) {
        var br = id.indexOf('(');
        if (br >= 0) {
            var dockId = id.substring(0, br);
            var panelId = id.substring(br + 1, id.length - 1);
            if (dockId[0] != '#' && +dockId != myUniqueId)
                return null;
            var dock = angular.element(dockId);
            return dock.controller('dockArea').getPanelById(+panelId);
        } else {
            return angular.element(id);
        }
    }
}])

.directive('dockArea', function () {
    return {
        controller: 'DockAreaCtrl',
        transclude: true,
        template: '<div class="dock-area" ng-transclude></div>',
    }
})

.directive('dockPanel', function () {
    return {
        scope: {
            title: '@',
            dock: '@'
        },
        require: '^dockArea',
        transclude: true,
        replace: true,
        template: '<div class="dock-panel">' +
                  '<h3 class="dock-title" ng-bind="title"></h3>' +
                  '<div class="dock-content" ng-transclude></div>' +
                  '<div class="dock-handle dock-handle-left"></div>' +
                  '<div class="dock-handle dock-handle-right"></div>' +
                  '<div class="dock-handle dock-handle-top"></div>' +
                  '<div class="dock-handle dock-handle-bottom"></div>' +
                  '</div>',
        link: function(scope, element, attrs, dockArea) {
            function makeResizeFunction(side) {
                return function(event) {
                    if (event.button == 0) {
                        dockArea.beginResize(event, element, angular.element(this), side);
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }
            }
            element.find('.dock-handle-left').on('mousedown', makeResizeFunction('left'));
            element.find('.dock-handle-right').on('mousedown', makeResizeFunction('right'));
            element.find('.dock-handle-top').on('mousedown', makeResizeFunction('top'));
            element.find('.dock-handle-bottom').on('mousedown', makeResizeFunction('bottom'));
            element.on('dragstart', function (event) {
                var dragId = dockArea.getDragId(element);
                event.originalEvent.dataTransfer.setData('text/x-dock-panel-id', dragId);
            });
            element.on('dragend', function (event) {

            });
            scope.$on('dockLayout', function () {
                var pos = dockArea.getPosition(element);
                // set the style ourselves because ng-style is fucking useless
                element.css('left',   'left'   in pos ? pos.left   + 'px' : 'auto');
                element.css('right',  'right'  in pos ? pos.right  + 'px' : 'auto');
                element.css('top',    'top'    in pos ? pos.top    + 'px' : 'auto');
                element.css('bottom', 'bottom' in pos ? pos.bottom + 'px' : 'auto');
                element.css('width',  'width'  in pos ? pos.width  + 'px' : 'auto');
                element.css('height', 'height' in pos ? pos.height + 'px' : 'auto');
                scope.$broadcast('reshape');
            })
            dockArea.addPanel(element, scope.dock);
        },
    }
})

.directive