angular.module('Sugar')

.service('SugarMommy', ['$compile',
function ($compile) {
    function showDockWindow(parentScope, title, dock, template, data) {
        var mainDock = angular.element('#main-dock');
        var panel = angular.element('<div dock-panel title="' + title + '" dock="' + dock + '">');
        switch (dock) {
            case 'top':
            case 'bottom':
                panel.height(mainDock.height() / 4);
                break;
            case 'left':
            case 'right':
                panel.width(mainDock.width() / 6);
                break;
        }
        mainDock.find('> .dock-area').append(panel);
        $compile(panel)(mainDock.scope());
        var childScope = parentScope.$new();
        angular.extend(childScope, data);
        var content = $compile(template)(childScope);
        panel.find('> .dock-content').append(content);
        return childScope;
    }
    return {
        showDockWindow: showDockWindow
    };
}])