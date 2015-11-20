/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/* global define */
define([
    './dashboard-view/dashboard-view',
    './deploy-menu/deploy-menu'
], function() {
    return {
        load_ipython_extension: function() { 
            console.debug('jupyter_dashboards loaded'); 
        }
    };
});
