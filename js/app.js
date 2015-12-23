angular.module('Sugar', [
    'ngRoute',
    'ngSanitize',
    'ui.bootstrap',
])

.controller('RootController', ['$scope', '$compile', 'SugarDaddy',
function ($scope, $compile, $daddy) {
    $scope.rootNode = $daddy.scene;
    $scope.menubar = $daddy.menu;
}])

.controller('SceneGraphCtrl', ['$scope', '$compile', 'SugarDaddy', 'SugarMommy',
function ($scope, $compile, $daddy, $mommy) {
    $scope.selection = $daddy.selection;
    $scope.select = function (nodeId, item) {
        $daddy.select(nodeId, item);
    }
    $scope.toggleExpanded = function () {
        if ($daddy.selection.nodeId == $scope.node.id && !$daddy.selection.item) {
            if ($scope.collapsed)
                $scope.collapsed = false;
            else
                $scope.collapsed = true;
        } else {
            $scope.select($scope.node.id);
        }
    }
    $scope.showContextMenu = function (event, node, item) {
        event.preventDefault();
        event.stopPropagation();
    }
    $scope.addShader = function (node) {
        node.shader = {
            /*vertex: 'text/plain,precision highp float;\n\nattribute vec3 aVertexPosition;\n'
                  + 'attribute vec3 aVertexNormal;\nattribute vec2 aTextureCoord;\nattribute vec3 aUVector;\n'
                  + 'attribute vec3 aVVector;\n\nuniform mat4 uModelMatrix;\nuniform mat4 uCameraMatrix;\n'
                  + 'uniform mat4 uViewportMatrix;\nuniform mat4 uViewportMatrixInverse;\n\n'
                  + 'varying highp vec2 vTextureCoord;\n\n'
                  + 'void main(void) {\n    gl_Position = uViewPortMatrix * uCameraMatrix * uModelMatrix * '
                  + 'vec4(aVertexPosition, 1.0);\n    vTextureCoord = aTextureCoord;\n}\n',
            fragment: 'text/plain,precision highp float;\n\n*/
            vertex: 'std-vertex.es2',
            fragment: 'std-fragment.es2',
        };
        $mommy.showDockWindow($scope, 'Shader', 'bottom',
            '<div glsl-editor node="node">', { node: node });
        $daddy.select(node.id, 'shader');
    }
}])

.directive('sceneGraph', ['RecursionHelper',
function (RecursionHelper) {
    return {
        scope: {
            node: '=',
            hideName: '=?'
        },
        templateUrl: 'controls/scene-graph.html',
        controller: 'SceneGraphCtrl',
        compile: function(element) {
            return RecursionHelper.compile(element);
        }
    };
}])

.factory('RecursionHelper', ['$compile', function($compile){
    return {
        /**
         * By Mark Lagendijk  -- http://stackoverflow.com/questions/14430655/recursion-in-angular-directives
         * Manually compiles the element, fixing the recursion loop.
         * @param element
         * @param [link] A post-link function, or an object with function(s) registered via pre and post properties.
         * @returns An object containing the linking functions.
         */
        compile: function(element, link){
            // Normalize the link parameter
            if(angular.isFunction(link)){
                link = { post: link };
            }

            // Break the recursion loop by removing the contents
            var contents = element.contents().remove();
            var compiledContents;
            return {
                pre: (link && link.pre) ? link.pre : null,
                /**
                 * Compiles and re-adds the contents
                 */
                post: function(scope, element){
                    // Compile the contents
                    if(!compiledContents){
                        compiledContents = $compile(contents);
                    }
                    // Re-add the compiled contents to the element
                    compiledContents(scope, function(clone){
                        element.append(clone);
                    });

                    // Call the post-linking function, if any
                    if(link && link.post){
                        link.post.apply(null, arguments);
                    }
                }
            };
        }
    };
}])
;