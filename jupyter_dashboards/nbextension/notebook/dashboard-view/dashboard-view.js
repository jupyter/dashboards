/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
/* global console, requirejs */

/**
 * This module extends the notebook to allow dashboard creation and viewing.
 */
define([
    'require',
    './polymer-support',
    '../link-css'
], function(
    require,
    PolymerSupport,
    linkCSS
) {
    'use strict';

    // use global require.js to setup the paths for our dependencies
    requirejs.config({
        packages: [
            { name: 'urth-common', location: require.toUrl('../dashboard-common').split('?')[0] }
        ],
        paths: {
            Gridstack: require.toUrl('../bower_components/gridstack/dist/gridstack.min').split('?')[0],
            lodash: require.toUrl('../bower_components/lodash/lodash').split('?')[0],
            text: require.toUrl('../bower_components/requirejs-text/text').split('?')[0]
            // jquery-ui is already loaded by Notebook, as 'jqueryui' in 4.0.x and 'jquery-ui' in 4.1.x
        },
        map: {
            // Gridstack uses jquery-ui 1.11 (supports AMD) while notebook uses 1.10 (non-amd).
            // Map Gridstack to the old non-AMD jquery-ui used by notebook.
            // We can't just use the 'jqueryui' that is mapped back to 'jquery-ui' in notebook 4.1.x+
            // because requirejs does not recursively apply maps and instead chooses the most
            // specific rule. Here, that would be whatever we set for Gridstack vs whatever notebook
            // set for '*'.
            Gridstack: {
                'jquery-ui/core': require.specified('jquery-ui') ? 'jquery-ui' : 'jqueryui',
                'jquery-ui/mouse': require.specified('jquery-ui') ? 'jquery-ui' : 'jqueryui',
                'jquery-ui/widget': require.specified('jquery-ui') ? 'jquery-ui' : 'jqueryui',
                'jquery-ui/resizable': require.specified('jquery-ui') ? 'jquery-ui' : 'jqueryui',
                'jquery-ui/draggable': require.specified('jquery-ui') ? 'jquery-ui' : 'jqueryui'
            }
        }
    });

    linkCSS('./dashboard-view/dashboard-actions.css');

    var dashboard;
    var $helpArea;

    PolymerSupport.init();

    // dashboard-actions depends on requirejs text plugin
    require(['./dashboard-actions', './dashboard-metadata'], function(DashboardActions, Metadata) {
        var dbActions = new DashboardActions({
            enterDashboardMode: function(doEnableGrid, reportLayout) {

                // set the proper dashboard layout class
                $('body').toggleClass('db-report-layout', reportLayout);
                $('body').toggleClass('db-grid-layout', !reportLayout);

                // create the dashboard
                require(['./dashboard', 'text!./help.html'], function(Dashboard, helpTemplate) {

                    function createDashboard() {
                        var opts = {
                            // DEFAULT OPTIONS - will be overridden by saved notebook metadata
                            dashboardLayout: Metadata.DASHBOARD_LAYOUT.GRID,
                            gridMargin: 10,
                            numCols: 12,
                            rowHeight: 20,
                            // END DEFAULT OPTIONS

                            container: $('#notebook-container'),
                            scrollContainer: $('#site'),
                            defaultCellHeight: 4,
                            defaultCellWidth: 4,
                            minCellHeight: 2,
                            onResize: PolymerSupport.onResize,
                            exit: function() {
                                dbActions.switchToNotebook();
                            },
                            reportLayout: reportLayout
                        };
                        Metadata.initialize(opts);
                        if (reportLayout) {
                            Metadata.updateCellLayout({
                                width: 12
                            });
                            Metadata.stackCells();
                        }
                        return Dashboard.create(opts);
                    }

                    if (dashboard) {
                        dashboard.destroy();
                        dashboard = createDashboard();
                    } else {
                        dashboard = createDashboard();
                        $helpArea = $(helpTemplate).prependTo($('#notebook_panel'));
                    }
                    dashboard.setInteractive({
                        enable: doEnableGrid,
                        complete: function() {
                            PolymerSupport.notifyResizeAll();
                        }
                    });
                });
            },
            exitDashboardMode: function() {
                dashboard.destroy();
                dashboard = null;
                PolymerSupport.notifyResizeAll();
                $helpArea.remove();
            },
            showAll: function() {
                dashboard.showAllCellsPacked();
            },
            showAllStacked: function() {
                dashboard.showAllCellsStacked();
            },
            hideAll: function() {
                dashboard.hideAllCells();
            }
        });
        dbActions.addMenuItems();
        dbActions.addToolbarItems();
    });
});
