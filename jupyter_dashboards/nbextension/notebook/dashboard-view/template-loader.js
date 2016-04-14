/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
/**
 * Requirejs plugin to load HTML template files without comment nodes.
 * This avoids us polluting the DOM with copyright header comments.
 * Returns a jQuery selection containing the template nodes
 */
define(['text'], function (text) {
    'use strict';

    return {
        load: function (name, req, load, config) {
            if (config.isBuild) {
                load();
                return;
            }
            req(['jquery', 'text!' + name], function ($, template) {
                load($(template).not(function() {
                    // filter out comment nodes
                    // (avoids polluting the DOM with copyright header comments)
                    return this.nodeType === 8;
                }));
            });
        }
    };
});
