angular.module('Sugar')

.directive('glslEditor', [ 'SugarDaddy', function ($daddy) {
    return {
        scope: {
            node: '=',
        },
        templateUrl: 'controls/glsl-editor.html',
        controller: ['$scope', function ($scope) {
            if (typeof $scope.node.shader == 'undefined')
                $scope.node.shader = { vertex: 'std-vertex.es2', fragment: 'std-fragment.es2' };
            $scope.programs = {};
            $daddy.resources.file($scope.node.shader.vertex).then(function (text) {
                $scope.programs.vertex = text;
            });
            $daddy.resources.file($scope.node.shader.fragment).then(function (text) {
                $scope.programs.fragment = text;
            });
        }],
    }
}])

.directive('glslSource', [ '$timeout', function ($timeout) {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, $model) {
            element.addClass('glsl-source');
            var editor = ace.edit(element[0]);
            editor.setTheme("ace/theme/twilight");
            editor.getSession().setMode("ace/mode/glsl");
            editor.setPrintMarginColumn(120);
            $model.$render = function () {
                editor.setValue($model.$modelValue || '', 0);
                editor.selection.clearSelection();
            };
            scope.$on('reshape', function () {
                $timeout(angular.bind(editor, editor.resize));
            });
        }
    }
}])

;