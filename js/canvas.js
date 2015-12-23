angular.module('Sugar')
.directive('sugarCanvas', ['$window', '$timeout', 'SugarDaddy',
function ($window, $timeout, $daddy) {
    return {
        template: '<canvas class="sugar-canvas"></canvas>',
        restrict: 'E',
        replace: true,
        scope: {
            name: '@?'
        },
        link: function (scope, element, attrs) {
            function glResize() {
                glResizeTimer = null;
                canvas.width = element.width();
                canvas.height = element.height();
                resizeBusy = true;
                renderer.resize(canvas.width, canvas.height);
                resizeBusy = false;
                if (needNewResize)
                    $timeout(glResize, resizeDelay);
                needNewResize = false;
            }
            function setCanvasSize() {
                canvas.width = element.width();
                canvas.height = element.height();
                if (glResizeTimer)
                    $timeout.cancel(glResizeTimer);
                if (resizeBusy)
                    needNewResize = true;
                else
                    glResizeTimer = $timeout(glResize, resizeDelay);
            }
            function computeLinearQuat(x0, y0, x1, y1) {
                var dx = x1 - x0;
                var dy = y1 - y0;
                if (dx == 0 && dy == 0)
                    return [1,0,0,0];
                var cy = Math.cos(-dx / 60);
                var sy = Math.sin(-dx / 60);
                var cx = Math.cos(-dy / 60);
                var sx = Math.sin(-dy / 60);
                return [cx*cy, cy*sx, cx*sy, -sx*sy];
            }
            function computeTrackballQuat(x0, y0, x1, y1) {
                var radius;
                if (canvas.width > canvas.height)
                    radius = canvas.height / 2;
                else
                    radius = canvas.width / 2;
                var rsq = radius*radius;
                x0 = x0 - canvas.width / 2;
                y0 = canvas.height / 2 - y0;
                x1 = x1 - canvas.width / 2;
                y1 = canvas.height / 2 - y1;
                var r0sq = x0*x0 + y0*y0;
                var r1sq = x1*x1 + y1*y1;
                var z0, z1, s0, s1;
                if (r0sq >= rsq/2) {  // off-ball for coordinate 0
                    z0 = rsq/2 / Math.sqrt(r0sq);
                    s0 = Math.sqrt(r0sq + z0*z0);
                } else {
                    z0 = Math.sqrt(rsq - r0sq);
                    s0 = radius;
                }
                if (r1sq >= rsq / 2) {
                    z1 = rsq/2 / Math.sqrt(r1sq);
                    s1 = Math.sqrt(r1sq + z1*z1);
                } else {
                    z1 = Math.sqrt(rsq - r1sq);
                    s1 = radius;
                }
                x0 /= s0; y0 /= s0; z0 /= s0;
                x1 /= s1; y1 /= s1; z1 /= s1;
                var rx = y0*z1 - z0*y1, ry = z0*x1 - x0*z1, rz = x0*y1 - y0*x1;
                var rs = Math.sqrt(rx*rx + ry*ry + rz*rz);
                var m = x0*x1 + y0*y1 + z0*z1;

                // This is the formula for precisely the rotation implied by the
                // trackball.  However for UX purposes we double this amount.
                // Oddly this feels more natural, even though turning the "ball"
                // by one-quarter amounts to a 180 degree rotation!
                var t = Math.sqrt((m + 1)/2);
                var s = Math.sqrt((1 - m)/2) / rs;
                return [-t, s*rx, s*ry, s*rz];

                //var s = Math.sqrt(1 - m*m) / rs;
                //return [-m, s*rx, s*ry, s*rz];
            }
            function setCapture(event, mode, button) {
                if (!mouseCapture.mode && mode) {
                    var ofs = element.offset();
                    var x = event.pageX - ofs.left;
                    var y = event.pageY - ofs.top;
                    angular.element($window).on('mousemove', mouseMove);
                    angular.element($window).on('mouseup', mouseUp);
                    mouseCapture.mode = mode;
                    mouseCapture.button = button;
                    mouseCapture.x0 = x;
                    mouseCapture.y0 = y;
                    cameraMatrix.push();
                }
            }
            function releaseCapture(event) {
                if (mouseCapture.mode) {
                    var ofs = element.offset();
                    var x = event.pageX - ofs.left;
                    var y = event.pageY - ofs.top;
                    angular.element($window).off('mousemove', mouseMove);
                    angular.element($window).off('mouseup', mouseUp);
                    mouseCapture.mode = 0;
                    cameraMatrix.swap();
                    cameraMatrix.pop();
                    return [ x - mouseCapture.x0, y - mouseCapture.y0 ];
                }
            }
            function mouseDown(event) {
                if (event.which == 2)
                    setCapture(event, 1, 2);
                event.preventDefault();
                event.stopPropagation();
            }
            function mouseUp(event) {
                if (mouseCapture.mode && mouseCapture.button == event.which)
                    releaseCapture(event);
                event.preventDefault();
                event.stopPropagation();
            }
            function mouseMove(event) {
                if (mouseCapture.mode == 1) {
                    var ofs = element.offset();
                    var x = event.pageX - ofs.left;
                    var y = event.pageY - ofs.top;
                    cameraMatrix.copyDown();
                    var rotation = computeLinearQuat(
                        mouseCapture.x0, mouseCapture.y0, x, y)
                    cameraMatrix.copyDown();
                    cameraMatrix.translate(0, 0, -10);
                    cameraMatrix.push();
                    cameraMatrix.loadQuaternion(rotation);
                    cameraMatrix.mul();
                    cameraMatrix.translate(0, 0, 10);
                    renderer.setCameraTransform(cameraMatrix);
                }
                event.preventDefault();
                event.stopPropagation();
            }
            var resizeDelay = 0; // todo: dynamically adjust upwards as render time increases
            var resizeBusy = false;
            var needNewResize = false;
            var canvas = element[0];
            var glResizeTimer = null;
            var mouseCapture = {
                mode: 0,
                button: 0,
                x0: 0,
                y0: 0,
            };
            var renderer = null;
            var cameraMatrix = new renderjs.MatrixStack();
            cameraMatrix.rotate(-10, [0, 1, 0]);
            cameraMatrix.rotate(-15, [1, 0, 0]);
            cameraMatrix.translate(0, 0, 10);
            $timeout(function () {
                setCanvasSize();
                renderjs.createRenderer(canvas, $daddy.resources).then(function (r) {
                    renderer = r;
                    $daddy.registerCanvas(canvas, scope.name, renderer);
                    renderer.time = $daddy.currentTime;
                    renderer.setCameraTransform(cameraMatrix);
                    renderer.render();
                    scope.$on('reshape', setCanvasSize);
                    angular.element($window).on('resize', setCanvasSize);
                    renderer.onrepaintrequired = function () { renderer.render(); };
                });
                scope.$on('destroy', function () {
                    $daddy.unregisterCanvas(canvas);
                    renderer.destroy();
                });
            });
            element.on('mousedown', mouseDown);
            element.on('mousemove', mouseMove);
            element.on('mouseup', mouseUp);
        }
    }
}])
