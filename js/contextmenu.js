angular.module('Sugar')

.directive('ngContextmenu', ['$compile', '$templateRequest', '$document',
function($compile, $templateRequest, $document) {
    function hitTest(element, x, y) {
        // Modified idea from schorfES: https://gist.github.com/schorfES/d55f5390307f33167834
        var
            position = element.offset(),
            width = element.outerWidth(),
            height = element.outerHeight()
        ;
        if (x >= position.left && x <= position.left + width
         && y >= position.top && y <= position.top + height)
            return true;

        // Ignore elements with overflow hidden, children will be masked and
        // can be ignored...
        if (element.css('overflow') !== 'hidden') {
            var children = element.children();
            for (var i = 0; i < children.length; ++ i) {
                if (hitTest($(children[i]), x, y))
                    return true;
            }
        }

        return false;
    }

    return {
        scope: {
            ngContextmenu: '&'
        },
        link: function (scope, element, attrs) {
            function displayMenu(event, menu, childScope) {
                function checkForDismiss(event) {
                    if (!hitTest(menu, event.clientX, event.clientY))
                        childScope.dismiss();
                }
                var x = event.pageX;
                var y = event.pageY;
                angular.element('body').append(menu);
                menu.css('position', 'absolute');
                menu.css('z-index', '2000');
                if (x + menu.width() >= $document.width())
                    x -= menu.width();
                if (y + menu.height() >= $document.height())
                    y -= menu.height();
                menu.css('left', x + 'px');
                menu.css('top', y + 'px');
                if (childScope) {
                    $document.on('mousedown', checkForDismiss);
                    childScope.$on('$destroy', function () {
                        $document.off('mousedown', checkForDismiss);
                    });
                }
            }
            element.on('contextmenu', function (event) {
                function dismiss() {
                    menu.remove();
                    if (childScope)
                        childScope.$destroy();
                }
                function makeChildScope(content) {
                    var childScope = scope.$parent.$new();
                    childScope.dismiss = dismiss;
                    if (content)
                        angular.extend(childScope, content);
                    return childScope;
                }
                event.preventDefault();
                event.stopPropagation();
                var menu = scope.ngContextmenu({$event: event});
                var childScope = null;
                if (menu) {
                    if (typeof menu == 'string') {
                        childScope = makeChildScope();
                        menu = $compile(menu)(childScope);
                        displayMenu(event, menu, childScope);
                    } else if (menu.template) {
                        childScope = makeChildScope(menu.scope);
                        menu = $compile(menu.template)(childScope);
                        displayMenu(event, menu, childScope);
                    } else if (menu.templateUrl) {
                        childScope = makeChildScope(menu.scope);
                        $templateRequest(menu.templateUrl).then(function (template) {
                            menu = $compile(template)(childScope);
                            displayMenu(event, menu, childScope);
                        });
                    } else {
                        displayMenu(event, menu);
                    }
                }
            });
        }
    }
}])
