/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
requirejs.config({
    //By default load any module IDs from ...
    baseUrl: './static',
    waitSeconds: 60,
    packages: [
        { name: 'urth-common', location: 'dashboard-common' }
    ],
    paths: {
        jquery: 'bower_components/jquery/dist/jquery.min',
        'jquery-ui': 'bower_components/jquery-ui/jquery-ui.min',
        lodash: 'bower_components/lodash/lodash.min',
        Gridstack: 'bower_components/gridstack/dist/gridstack.min',
        'jupyter-js-services': 'dashboard-lib/jupyter-js-services/jupyter-js-services',
        'jupyter-js-output-area': 'dashboard-lib/jupyter-js-output-area/jupyter-js-output-area'
    },
    map: {
        '*': {
            'jQuery': 'jquery'
        },
        Gridstack: {
            'jquery-ui/core': 'jquery-ui',
            'jquery-ui/mouse': 'jquery-ui',
            'jquery-ui/widget': 'jquery-ui',
            'jquery-ui/resizable': 'jquery-ui',
            'jquery-ui/draggable': 'jquery-ui'
        }
    }
});


requirejs(['urth/dashboard'], function(Dashboard) {
    Dashboard.init().then(function() {
        // Ugly, because we're tying dashboards specifically to urth_widgets
        // but we don't have another way to detect and determine if / how these
        // should be setup at the moment.
        requirejs(['urth_widgets/js/init/init'], function(widgetInit) {
            // Initialize the widgets
            widgetInit('static/').then(function() {
                // Now that all dependencies are ready, execute everything
                Dashboard.executeAll();
            });
        }, function(err) {
            console.warn('urth widgets not available');
            // Continue with execution of cells
            Dashboard.executeAll();
        });
    });
});
