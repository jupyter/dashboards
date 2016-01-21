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

                    var data;
                    try {
                        data = msg.content.traceback.join('\n');
                    } catch(e) {
                        console.error('A kernel error occured without a traceback');
                        return;
                    }
                    try {
                        // Try to pretty-print the error if IPython.utils are available
                        // print error to console (following code as seen in Notebook's OutputArea.append_text)
                        data = IPython.utils.fixConsole(data);
                        data = IPython.utils.fixCarriageReturn(data);
                        data = IPython.utils.autoLinkUrls(data);
                        // `data` is HTML, print out text-only
                        console.error($('<div/>').append(data).text());
                    } catch(e) {
                        // Otherwise print what we can: the raw data
                        console.error(data);
                    }
                });
                enabled = true;
            }
        }
    };
});
