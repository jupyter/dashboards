/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/* global console, require */
define([
    'require',
    'jquery'
], function(
    require,
    $
) {
    // load the associated stylesheet
    return function(url) {
        var link = document.createElement('link');
        link.type = 'text/css';
        link.rel = 'stylesheet';
        link.href = require.toUrl(url);

        // set a callback to let us know when the CSS has loaded
        var deferred = $.Deferred();
        $(link).on('load', function() {
            deferred.resolve();
        });

        document.getElementsByTagName('head')[0].appendChild(link);

        return deferred;
    };
});
