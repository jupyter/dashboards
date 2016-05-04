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
                Notebook.Notebook.prototype.__copy_cell = Notebook.Notebook.prototype.copy_cell;
                Notebook.Notebook.prototype.copy_cell = function() {
                    this.__copy_cell();
                    for (var i = 0; i < this.clipboard.length; i++) {
                        var cell_json = this.clipboard[i];
                        if (cell_json.metadata.urth !== undefined && cell_json.metadata.urth.dashboard !== undefined && cell_json.metadata.urth.dashboard.layout !== undefined) {
                            // other dashboard metadata may need to be preserved
                            delete cell_json.metadata.urth.dashboard.layout;
                            cell_json.metadata.urth.dashboard.hidden = true;
                        }
                    }
                }
            }
        }
    };
});
