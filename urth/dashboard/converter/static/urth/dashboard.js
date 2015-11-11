/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
define([
    'jquery',
    'jupyter-js-services',
    'jupyter-js-output-area'
], function(
    $,
    Services,
    OutputArea
) {
    var $container,
        kernel;

    var CONTAINER_URL = 'urth_container_url';

    function getQueryParam(name) {
        var vars = window.location.search.substring(1).split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            if (pair[0] === name) {
                return decodeURIComponent(pair[1]);
            }
        }
        return null;
    }

    function initKernel(args) {
        var kernelReady = $.Deferred();

        // TODO
        // 1. Figure out how to load `display_data` comm messages (includes source for matplotlib, styling, etc)
        // 2. Create this global, so extensions like matplotlib can register a comm callback:
        //      IPython.notebook.kernel.comm_manager.register_target('matplotlib', mpl.mpl_figure_comm)

        var baseUrl = window.Urth.thebe_url;
        baseUrl += (baseUrl[baseUrl.length - 1] === '/' ? '' : '/'); // ensure it ends in '/'

        // check for a previous container, which we can reuse
        var containerUrl = localStorage.getItem(CONTAINER_URL);
        var existingContainerFuture;
        if (containerUrl) {
            existingContainerFuture = checkExistingContainer(containerUrl);
        } else {
            existingContainerFuture = false;
        }

        var dataUrlFuture;
        if (Urth.tmpnb_mode) {
            // TMPNB mode: check if we need to spawn a new container or use existing one
            dataUrlFuture = $.when(existingContainerFuture).then(function(containerExists) {
                if (!containerExists) {
                    return callSpawn(baseUrl);
                } else {
                    return { url: containerUrl };
                }
            });
        } else {
            dataUrlFuture = { url: baseUrl };
        }

        $.when(dataUrlFuture).then(function(data) {
            var options = {
                baseUrl: data.url,
                wsUrl: data.url.replace(/^http/, 'ws'),
                name: 'python3'
            };
            Services.startNewKernel(options).then(function(_kernel) {
                kernel = _kernel;

                // show a busy indicator when communicating with kernel
                var debounced;
                kernel.statusChanged.connect(function(_kernel, status) {
                    clearTimeout(debounced);
                    debounced = setTimeout(function() {
                        var isBusy = status === Services.KernelStatus.Busy;
                        $('.busy-indicator')
                            .toggleClass('show', isBusy)
                            // Prevent progress animation when hidden by removing 'active' class.
                            .find('.progress-bar')
                                .toggleClass('active', isBusy);
                    }, 500);
                });
                kernel.commOpened.connect(function(_kernel, commMsg) {
                    var comm = kernel.connectToComm(commMsg.target_name, commMsg.comm_id);
                });

                // TODO IPython.notebook.events.emit('kernel_connected.Kernel', {data: kernel});
                //          ==> IPyWidgets expects `kernel` to have `.comm_manager.new_comm`

                kernelReady.resolve();
            });
        });

        return kernelReady;
    }

    // Spawn a new kernel container. Returns promise to container URL.
    function callSpawn(baseUrl) {
        return $.post(baseUrl + 'api/spawn/', { image_name: 'jupyter/notebook' })
            .then(function(data) {
                if (data.status === 'full') {
                    throw new Error('tmpnb server is full');
                } else {
                    // test if we have a full URL (new tmpnb) or partial (old tmpnb)
                    if (!/^http/.test(data.url)) {
                        data.url = baseUrl + data.url;
                    }
                    localStorage.setItem(CONTAINER_URL, data.url);
                    return data;
                }
            })
            .fail(function(e) {
                throw new Error('Could not connect to tmpnb server');
            });
    }

    // Check if container at URL is valid. Returns promise to boolean value.
    function checkExistingContainer(url) {
        return $.get(url + 'api/kernels')
            .then(function() {
                return true;
            })
            .fail(function(e) {
                localStorage.removeItem(CONTAINER_URL);
                return false;
            });
    }

    function initGrid(deferred) {
        require(['urth-common/gridstack-custom'], function(Gridstack) {
            $('body').addClass('grid-view');
            $container.addClass('grid-stack');

            // enable gridstack
            var gridstack = $container.gridstack({
                vertical_margin: Urth.cellMargin,
                cell_height: Urth.defaultCellHeight,
                width: Urth.maxColumns,
                static_grid: true
            }).data('gridstack');

            var halfMargin = Urth.cellMargin / 2;
            var styleRules = [
                {
                    selector: '#dashboard-container .grid-stack-item.rendered_html',
                    rules: 'padding: ' + halfMargin + 'px ' + (halfMargin + 6) + 'px;',
                }
            ];
            gridstack.generateStylesheet(styleRules);

            deferred.resolve();
        });
    }

    function showRow(row, col) {
        $('body').addClass('show-row-only');
        var $cells = $container.find('.grid-stack-item');

        var rowAttr = '[data-gs-y="' + row + '"]';
        $cells.filter(':not(' + rowAttr + ')').hide();

        if (col) {
            // show a single cell
            $('body').addClass('single-cell');
            var colAttr = '[data-gs-x="' + col + '"]';
            $cells.filter(':not(' + colAttr + ')').hide();
        } else {
            // show full row
            $cells.filter(rowAttr).css('flex', function() {
                var $cell = $(this);
                var sizex = $cell.attr('data-gs-width');
                return sizex + ' 0 ' + sizex + 'px';
            });
        }
    }

    function _showDashboard() {
        $('#outer-dashboard').css('visibility', '');
    }

    var outputAreaHandledMsgs = {
        'clear_output': 1,
        'stream': 1,
        'display_data': 1,
        'execute_result': 1,
        'error': 1
    };

    return {
        init: function() {
            $container = $('#dashboard-container');

            // initialize thebe
            var kernelReady = initKernel({
                url: Urth.thebe_url
            });
            // initialize the grid layout
            var gridReady = $.Deferred();
            var row = getQueryParam('row');
            if (!row) {
                // initialize the grid and show it once ready
                initGrid(gridReady);
                gridReady.then(_showDashboard);
            } else {
                // show only given row/column
                var col = getQueryParam('col');
                showRow(row, col);
                _showDashboard();
                // resolve the grid promise
                gridReady.resolve();
            }

            // we're fully initialized when both grid and thebe
            // are initialized
            return $.when(gridReady, kernelReady);
        },

        executeAll: function() {
            // thebe.run_cell(0, thebe.cells.length);
            $('pre[data-executable]').each(function() {
                var code = $(this).text();
                var model = new OutputArea.OutputModel();
                var view = new OutputArea.OutputView(model, document);
                $(this).replaceWith(view.el);

                var future = kernel.execute({
                    code: code,
                    silent: false
                });
                // future.onDone = function() {
                //     console.log('Cell has been run');
                // };
                future.onIOPub = function(msg) {
                    // console.log('onIOPub::', msg.msg_type);
                    if (msg.msg_type in outputAreaHandledMsgs) {
                        model.consumeMessage(msg);
                    }
                };
            });
        }
    };
});
