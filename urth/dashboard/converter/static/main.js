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
        // Ugly, because we're special-casing declarative widget support, but
        // they need to be pre-loaded onto the page before we begin executing
        // any notebook code that depends on them.

        // Declarative widgets 0.2.x subclass the WidgetModel base class
        // to guarantee message sequence. They register this new base with 
        // the widget manager. Because the Thebe build includes these 
        // modules and initializes the manager singleton, we need to map 
        // them across from the Thebe loader to our loader to avoid making
        // second, independent copies.
        // All this goes away when we can use jupyter-js-services and 
        // ipywidgets independently.
        define('nbextensions/widgets/widgets/js/manager', function() {
            return {
                // The kernel object has a reference to the widget manager
                // (for now at least ...)
                WidgetManager: IPython.notebook.kernel.widget_manager.constructor
            };
        });
        define('nbextensions/widgets/widgets/js/widget', function() {
            // WidgetModel is one of the registered model types
            return IPython.notebook.kernel.widget_manager.constructor._model_types;
        });

        // Now try to load the widgets
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
