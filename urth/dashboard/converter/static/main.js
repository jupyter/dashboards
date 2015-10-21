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
        lodash: 'bower_components/lodash/lodash.min',
        Gridstack: 'bower_components/gridstack/dist/gridstack.min',
        Thebe: 'thebe/main-built'
        // jquery-ui is included in Thebe
    },
    map: {
        '*': {
            'jQuery': 'jquery'
        },
        // jquery-ui is included in Thebe's main-built.js. Map Gridstack to load from there.
        Gridstack: {
            'jquery-ui/core': 'Thebe',
            'jquery-ui/mouse': 'Thebe',
            'jquery-ui/widget': 'Thebe',
            'jquery-ui/resizable': 'Thebe',
            'jquery-ui/draggable': 'Thebe'
        }
    },
    shim: {
        Thebe: {
            deps: ['jquery']
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
