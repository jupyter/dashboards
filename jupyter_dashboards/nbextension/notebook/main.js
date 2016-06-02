/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/* global define */
define([
    './dashboard-view/dashboard-view',
    'notebook/js/notebook'
], function(
    View,
    Notebook
) {
    return {
        load_ipython_extension: function() {
            console.debug('jupyter_dashboards loaded');
            if (Notebook.Notebook.prototype.copy_cell) {
                Notebook.Notebook.prototype.__copy_cell =
                    Notebook.Notebook.prototype.copy_cell;
                Notebook.Notebook.prototype.copy_cell = function() {
                    this.__copy_cell();
                    for (var i = 0; i < this.clipboard.length; i++) {
                        var cell_json = this.clipboard[i];
                        if (cell_json.metadata.extensions !== undefined &&
                            cell_json.metadata.extensions.jupyter_dashboards !== undefined &&
                            cell_json.metadata.extensions.jupyter_dashboards.views !== undefined) {

                            // Clear out data for each view.
                            // Other dashboard metadata may need to be preserved.
                            var views = cell_json.metadata.extensions.jupyter_dashboards.views;
                            var viewIds = Object.keys(views);
                            for (var j = 0; j < viewIds.length; j++) {
                                views[viewIds[j]] = { hidden: true };
                            }
                        }
                    }
                };
            }
        }
    };
});
