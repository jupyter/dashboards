/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Registers an error handler which prints errors to the JS console.
 */
define([
    'require',
    'jquery'
], function(
    require,
    $
) {
    'use strict';
    var enabled = false;
    return {
        /**
         * Show IOPub errors in the JS console.
         * @param  {object} IPython    "global" IPython singleton
         */
        enable: function(IPython) {
            if (!enabled) {
                var errorHandler = IPython.notebook.kernel.get_iopub_handler('error'); // save old handler
                IPython.notebook.kernel.register_iopub_handler('error', function(msg) {
                    errorHandler(msg); // call old handler

                    try {
                        // print error to console (following code as seen in Notebook's OutputArea.append_text)
                        var data = msg.content.traceback.join('\n');
                        data = IPython.utils.fixConsole(data);
                        data = IPython.utils.fixCarriageReturn(data);
                        data = IPython.utils.autoLinkUrls(data);
                        // `data` is HTML, print out text-only
                        console.error($('<div/>').append(data).text());
                    } catch(e) {}
                });
                enabled = true;
            }
        }
    };
});
