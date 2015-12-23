angular.module('Sugar')
.service('SugarDaddy', [
function () {
    function logError(err) {
        console.error(err.message);
        console.error(JSON.stringify(err.reason));
    }
    function setHighlights(node, time, program) {
        if (node.id == selection.nodeId)
            program.highlightColor = [0,0,1,0.5];
        else
            program.highlightColor = [0,0,0,0];
    }
    function registerCanvas(canvas, name, renderer) {
        views[canvas] = {
            name: name,
            renderer: renderer
        };
        renderer.parameters.$sugar_ui_showground = showGround;
        renderer.parameters.$sugar_ui_showaxes = showAxes;
        renderer.addNode(scene);
        renderer.addNode(ui);
        renderer.onerror = logError;
        renderer.onbeforerendernode = setHighlights;
    }
    function unregisterCanvas(canvas) {
        if (views[canvas])
            views[canvas].renderer.onbeforerendernode = null;
        delete views[canvas];
    }
    function createDefaultScene() {
        return {
            id: 'Scene',
            cameras: [{
                id: 'defaultCamera',
                transform: [
                    ['rotate', 15, 1, 0, 0],
                    ['translate', 0, 0, 10]
                ]
            }],
            lights: [{
                id: 'point light 1',
                type: 'point',
                position: [0, -200, 1000],
                color: [0.8, 0.8, 0.8],
            }, {
                id: 'point light 2',
                type: 'point',
                position: [-600, 600, -400],
                color: [0.8, 0.8, 0.8],
            }, {
                id: 'point light 3',
                type: 'point',
                position: [600, 600, -400],
                color: [0.8, 0.8, 0.8],
            }, {
                id: 'ambient light',
                type: 'ambient',
                color: [0.2, 0.2, 0.2],
            }],
            children: [
                renderjs.Primitives.cube({id: 'cube1'}),
                renderjs.Primitives.sphere({id: 'sphere1', transform: [['translate', 2,0,0], ['scale',0.7071,0.7071,0.7071]]})
            ]
        };
    }
    function createDefaultUi() {
        return {
            mesh: {
                vertices: [ [-1, -1, 0], [1,-1,0], [1,1,0], [-1,1,0] ],
                faces: [ [0, 1, 2], [2, 3, 0] ],
                texture: 'images/texture-ground.png',
            },
            shader: {
                vertex: 'shaders/ui-vtx.es2',
                fragment: 'shaders/ui-frag.es2',
                blend: 'default',
                uniforms: {
                    showGround: 'bool',
                    showAxes: 'bool',
                },
                parameters: {
                    showGround: '$sugar_ui_showground',
                    showAxes: '$sugar_ui_showaxes'
                }
            }
        }
    }
    function repaintAllViews() {
        for (var k in views) {
            views[k].renderer.parameters.$sugar_ui_showground = showGround;
            views[k].renderer.parameters.$sugar_ui_showaxes = showAxes;
            views[k].renderer.render();
        }
    }
    function changeSelection(nodeId, item) {
        selection.nodeId = nodeId;
        selection.item = item;
        repaintAllViews();
    }
    var views = {};
    var scene = createDefaultScene();
    var ui = createDefaultUi();
    var resources = new renderjs.Resources();
    var selection = {
        nodeId: 'cube1',
    };
    var showGround = true;
    var showAxes = true;
    var menu = [ {
        label: 'Project', items: []
    }, {
        label: 'View', items: [ {
            label: 'Configure',
            type: 'command',
            handler: function () { alert('hi'); },
        }, {
            label: 'Axes',
            type: 'checkbox',
            getterSetter: function (newValue) {
                if (typeof newValue != 'undefined') {
                    showAxes = newValue;
                    repaintAllViews();
                }
                return showAxes;
            },
        }, {
            label: 'Ground Plane',
            type: 'checkbox',
            getterSetter: function (newValue) {
                if (typeof newValue != 'undefined') {
                    showGround = newValue;
                    repaintAllViews();
                }
                return showGround;
            }
        } ]
    } ];
    return {
        scene: scene,
        resources: resources,
        selection: selection,
        registerCanvas: registerCanvas, // (canvas, name, renderer)
        unregisterCanvas: unregisterCanvas, // (canvas)
        select: changeSelection,
        menu: menu
    };
}])
