/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
/**
 * This module provides an API to manage compatibility between
 * Jupyter Dashboards extension metadata.
 *
 * Jupyter Dashboard metadata structure:
 *    https://github.com/jupyter-incubator/dashboards/wiki/Dashboard-Metadata-and-Rendering
 */
define([
    'jquery',
    'base/js/namespace',
    './object-util'
], function(
    $,
    IPython,
    ObjectUtil
) {
    'use strict';

    var GRID_DEFAULT = 'grid_default';
    var REPORT_DEFAULT = 'report_default';

    // Mapping of view type to view id (from dashboard-metadata.js)
    // This will change when multiple views of the same type are supported.
    var VIEW_TO_ID = {
        grid: GRID_DEFAULT,
        report: REPORT_DEFAULT
    };

    return {
        /**
         * Converts version 0.x metadata structure to version 1.
         * Versions 0.x and 1 currently do not overlap.
         * This must be run AFTER the version 1 metadata is initialized in
         * `dashboard-metadata.js`.
         */
        convert: function() {
            var metadata = IPython.notebook.metadata;
            var jupyter_dashboards = metadata.extensions.jupyter_dashboards;

            // 0.x metadata resides under "urth"
            var oldNotebookMetadata = IPython.notebook.metadata.urth;
            if (!oldNotebookMetadata) { return; }

            // notebook-level metadata
            if (oldNotebookMetadata.dashboard) {
                // set active view
                if (oldNotebookMetadata.dashboard.layout) {
                    jupyter_dashboards.activeView =
                        VIEW_TO_ID[oldNotebookMetadata.dashboard.layout];
                } else {
                    jupyter_dashboards.activeView = GRID_DEFAULT;
                }

                // copy dashboard properties
                Object.keys(oldNotebookMetadata.dashboard).filter(function(key) {
                    return key !== 'layout';
                }).forEach(function(key) {
                    jupyter_dashboards.views[jupyter_dashboards.activeView][key] =
                        oldNotebookMetadata.dashboard[key];
                });
            }

            // cell-level metadata
            IPython.notebook.get_cells().forEach(function(cell) {
                if (ObjectUtil.has(cell, 'metadata.urth.dashboard')) {
                    var cellMetadata = cell.metadata;
                    var cellDashboard = cellMetadata.extensions.jupyter_dashboards;

                    // copy hidden state
                    Object.keys(cellDashboard.views).forEach(function(view) {
                        cellDashboard.views[view].hidden = false;
                    });
                    if (jupyter_dashboards.activeView === GRID_DEFAULT &&
                        Object.keys(cellMetadata.urth.dashboard).length === 0) {
                        // special case: empty grid cells were implicitly hidden
                        cellDashboard.views[jupyter_dashboards.activeView].hidden = true;
                    } else {
                        cellDashboard.views[jupyter_dashboards.activeView].hidden =
                            !!cellMetadata.urth.dashboard.hidden;
                    }

                    // copy layout properties
                    if (cellMetadata.urth.dashboard.layout) {
                        var cellLayout = cellMetadata.urth.dashboard.layout;

                        // only grid layout has properties
                        //  so copy all layout properties into default grid view
                        Object.keys(cellLayout).forEach(function(key) {
                            cellDashboard.views[GRID_DEFAULT][key] = cellLayout[key];
                        });
                    }

                    // clear old metadata
                    delete cellMetadata.urth;
                }
            });

            // clear old metadata
            delete IPython.notebook.metadata.urth;
        }
    };
});
