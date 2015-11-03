/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/*************
  Urth dashboard metadata structure:
    "metadata": {
         "urth": {
             "dashboard": {
                 "layout": {
                     "col":
                     ...
                 },
                 "hidden": false
             }
         }
    }
 **************/

define([
    'jquery',
    'lodash',
    'base/js/namespace',
    'urth-common/error-log',
    '../link-css',
    'urth-common/gridstack-custom' // jquery plugin: return value not used
], function(
    $,
    _,
    IPython,
    ErrorLog,
    linkCSS
) {
    'use strict';

    var cssLoaded = false;
    var idCounter = 0;

    // duration => the resize transition on gridstack and gridstack cells
    var RESIZE_DURATION = 350;

    var HIDDEN_CELLS_MARGIN = 10;
    var HIDDEN_CELLS_BOTTOM_MARGIN = 20;

    var DRAG_HANDLE = '.drag-handle';

    var Dashboard = function(opts) {
        this.$container = $(opts.container);
        this.opts = opts;
        this._loaded = $.Deferred();

        ErrorLog.enable(IPython);

        var gridCssLoaded = cssLoaded;
        if (!cssLoaded) {
            gridCssLoaded = linkCSS('./bower_components/gridstack/dist/gridstack.css');
            linkCSS('./dashboard-common/gridstack-overrides.css');
            linkCSS('./dashboard-common/dashboard-common.css');
            linkCSS('./dashboard-view/dashboard-view.css');
            cssLoaded = true;
        }

        // Must wait for CSS to be evaluated before we generate the grid. Otherwise, positioning
        // is calculated incorrectly.
        $.when(gridCssLoaded).then(function() {
            $('body').addClass('urth-dashboard');
            this._initGridMetadata();
            var nolayout = this._addMetadataToDom(); // returns cells that don't have metadata

            var self = this;
            this.$container.children().each(function() {
                self._addGridControls($(this));
            });

            this._enableGridstack();
            this._calcCellWidth(); // now that Gridstack has been enabled

            nolayout.forEach(this._addNotebookCellToDashboard.bind(this)); // handle cells without grid layout metadata
            this._createhiddenHeader(); // create a container to hold hidden cells

            if (nolayout.length > 0) {
                this._saveGrid(); // save notebook if any new layout metadata was created
            }

            $(window).on('resize.Dashboard', _.debounce(function() {
                self._calcCellWidth();
                self._repositionHiddenCells();
            }, 200));

            this._loaded.resolve();
        }.bind(this));

    };

    Dashboard.prototype._calcCellWidth = function() {
        this._cellMinWidthPX =
            Math.floor(this.$container.width() / this.opts.numCols) - this.opts.gridMargin;
    };

    // creates empty dashboard metadata (if necessary)
    Dashboard.prototype._initGridMetadata = function() {
        function _urthMetdata(metadata) {
            var urth = metadata.urth = metadata.urth || {};
            urth.dashboard = urth.dashboard || {};
            return urth;
        }

        // init notebook metadata
        _urthMetdata(IPython.notebook.metadata);
        $.extend(IPython.notebook.metadata.urth.dashboard, {
            defaultCellHeight: this.opts.rowHeight,
            cellMargin: this.opts.gridMargin,
            maxColumns: this.opts.numCols
        });

        // init cell metadata
        var self = this;
        this.$container.find('.cell').each(function(idx) {
            _urthMetdata(self._getCellMetadata($(this)));
        });
    };

    // Adds cell metadata to DOM. Returns DOM nodes for which there is no metadata.
    Dashboard.prototype._addMetadataToDom = function() {
        var nolayout = [];
        this.$container.addClass('grid-stack');
        var self = this;
        this.$container.find('.cell').each(function(idx) {
            // Gridstack expects horizontal margins to be handled within the cell. To accomplish
            // that, we need to wrap the cell contents in an element.
            // Also, we add a separate div to show the border, since we want to show that above
            // the cell contents. This is necessary since cell contents may overflow the cell
            // bounds, but we still want to show the user those boundaries.
            var el = $(this);
            if (el.find('> .dashboard-item-background').length === 0) {
                el.prepend('<div class="dashboard-item-background"/><div class="dashboard-item-border"><i class="fa fa-arrows"/></div>');
            }

            var metadata = self._getCellMetadata(el);
            if (!metadata.urth.dashboard.hidden) {
                if (metadata.urth.dashboard.layout) {
                    var layout = metadata.urth.dashboard.layout;
                    self._initVisibleCell(el, layout);
                } else {
                    nolayout.push(this); // cell doesn't have layout info; save for later
                }
            }
        });
        return nolayout;
    };

    Dashboard.prototype._enableGridstack = function() {
        this.gridstack = this.$container.gridstack({
                vertical_margin: this.opts.gridMargin,
                cell_height: this.opts.rowHeight,
                width: this.opts.numCols,
                // disables single-column mode (which reorders DOM nodes)
                min_width: 0,
                // Disable animation when first creating Gridstack so it doesn't do a resize
                // transition on cells when first created. We enable animation later (in
                // `setInteractive`).
                animate: false,
                draggable: {
                    handle: DRAG_HANDLE,
                    scroll: true
                },
                resizable: {
                    handles: 'e, se, s, sw, w'
                }
            })
            .on('dragstop resizestop', this._saveGrid.bind(this)) // TODO: use `onchange` instead?
            .on('dragstart dragstop', function(event) {
                $('body').toggleClass('dragging', event.type === 'dragstart');
            })
            .data('gridstack');

        if (typeof this.opts.onResize === 'function') {
            var self = this;
            this.$container.on('dragstop resizestop', function(event, ui) {
                // Gridstack fires this event before the resizing animation has finished
                // (see https://github.com/troolee/gridstack.js/issues/159). Temporary workaround
                // is to fire our callback after the resize transition has finished.
                setTimeout(function() {
                    self.opts.onResize(event.target);
                    self._repositionHiddenCells();
                }, RESIZE_DURATION);
            });
        }

        // setup dynamic style rules which depend on margin size
        var halfMargin = this.opts.gridMargin / 2;
        var styleRules = [
            // position background across cell, with margins on sides
            {
                selector: '.grid-stack .grid-stack-item .dashboard-item-background, .grid-stack .grid-stack-item .dashboard-item-border',
                rules: 'left: ' + halfMargin + 'px; right: ' + halfMargin + 'px;'
            },

            // set horizontal margin on cell contents
            {
                selector: '.grid-stack .grid-stack-item.cell > :not(.dashboard-item-background):not(.dashboard-item-border):not(.ui-resizable-handle):not(.grid-control-container)',
                rules: 'margin: 0 ' + halfMargin + 'px;'
            },

            // set placeholder size to match; pass "#notebook-container" to make this rule have precedence
            {
                selector: '#notebook-container.grid-stack .grid-stack-placeholder > .placeholder-content',
                rules: 'left: ' + halfMargin + 'px; right: ' + halfMargin + 'px;'
            },

            // offset grid controls
            {
                selector: '.grid-stack .grid-stack-item .grid-control-container.grid-control-ne',
                rules: 'right: ' + halfMargin + 'px;'
            },
            {
                selector: '.grid-stack .grid-stack-item .grid-control-container.grid-control-nw',
                rules: 'left: ' + halfMargin + 'px;'
            },

            // Place resize handles
            {
                selector: '.grid-stack .grid-stack-item > .ui-resizable-se',
                rules: 'right: ' + (halfMargin+5) + 'px;'
            },
            {
                selector: '.grid-stack .grid-stack-item > .ui-resizable-sw',
                rules: 'left: ' + (halfMargin+5) + 'px;'
            }
        ];
        this.gridstack.generateStylesheet(styleRules);
    };

    Dashboard.prototype._repositionHiddenCells = function() {
        if (!this.interactive) {
            return;
        }

        var offsetpx = $('#dashboard-hidden-header').outerHeight();

        // recalculate hidden cells offsets
        this.$container
            .find('> :not(.grid-stack-item)')
            .each(function() {
                var $cell = $(this);
                $cell.css({
                    top: 'calc(100% + ' + offsetpx + 'px)',
                    left: 0
                });
                offsetpx += $cell.outerHeight() + HIDDEN_CELLS_MARGIN;
            });

        // recalculate height of #notebook element (since absolutely positioned)
        var newHeight = $('#notebook-container').outerHeight() + offsetpx + HIDDEN_CELLS_BOTTOM_MARGIN;
        $('#notebook').css('height', newHeight);
    };

    // computes metadata for a cell that doesn't have grid layout metadata
    Dashboard.prototype._addNotebookCellToDashboard = function(cell) {
        var $cell = $(cell).css({ visibility: 'hidden', display: 'block' });

        var dim = this._computeCellDimensions($cell);
        if (!dim.isEmpty) {
            this.gridstack.add_widget($cell, 0, 0, dim.width, dim.height, true, false /* attach_node */);
            this._initVisibleCell($cell);
        }

        $cell.css({ visibility: '', display: '' });
    };

    Dashboard.prototype._createhiddenHeader = function() {
        this.$hiddenHeader = $('<div id="dashboard-hidden-header" class="container hidden"/>');
        var $header = $('<div class="header"/>')
            .appendTo(this.$hiddenHeader)
            .append('<h2 class="title">Hidden Cells</h2>');
        $('<button class="btn btn-xs">Show code</button>')
            .appendTo($header)
            .click(this._toggleHiddenCellCode.bind(this));
        this.$hiddenHeader.insertAfter(this.$container); // add to DOM

        var self = this;
        setTimeout(function() {
            if (self.$container.find('.cell:not(.grid-stack-item)').length > 0) {
                self.$hiddenHeader.removeClass('hidden');
            }
            self._repositionHiddenCells(); // show hidden cells
        }, 0);
    };

    Dashboard.prototype._getCellMetadata = function($elem) {
        if ($elem.is('.cell')) {
            return $elem.data('cell').metadata; // pull cell metadata from element data
        }
        var $cell = this._getParentCell($elem);
        if ($cell.length) {
            return this._getCellMetadata($cell);
        }
    };

    // Update cell's metadata.
    Dashboard.prototype._updateCellMetadata = function($cell, layout) {
        var metadata = this._getCellMetadata($cell);
        if (layout) {
            metadata.urth.dashboard.layout = layout;
            delete metadata.urth.dashboard.hidden;
        } else {
            delete metadata.urth.dashboard.layout;
            metadata.urth.dashboard.hidden = true;
        }
        IPython.notebook.set_dirty(true);
    };

    // For a given DOM element, return the Notebook cell which contains it. Works with both
    // Notebook and "hidden" cells.
    Dashboard.prototype._getParentCell = function(elem) {
        var $elem = $(elem);
        var $parent = $elem.parents('.cell').first();
        return $parent;
    };

    var gridControlsTpl =
        '<div class="grid-control-container grid-control-nw">' +
            '<i class="grid-control drag-handle fa fa-arrows fa-fw"></i>' +
            '<i class="grid-control edit-btn fa fa-pencil fa-fw"></i>' +
        '</div>' +
        '<div class="grid-control-container grid-control-ne">' +
            '<i class="grid-control close-btn fa fa-close fa-fw"></i>' +
            '<i class="grid-control add-btn fa fa-plus fa-fw"></i>' +
        '</div>';

    Dashboard.prototype._addGridControls = function($cell) {
        var self = this;
        if ($cell.find('.grid-control-nw').length === 0) {
            var gc = $(gridControlsTpl).appendTo($cell);
            gc.find('.close-btn').click(function() {
                    self._hideCell(self._getParentCell(this));
                });
            gc.find('.add-btn').click(function() {
                    // show a single cell at full width
                    self._showCell(self._getParentCell(this), { width: self.opts.numCols });
                });
            gc.find('.edit-btn').click(function() {
                    var $cell = self._getParentCell(this);
                    self.opts.exit();

                    // select cell and put it in edit mode
                    var nbCell = $cell.data('cell');
                    var nbIndex = IPython.notebook.find_cell_index(nbCell);
                    IPython.notebook.select(nbIndex).edit_mode(nbCell);

                    $cell.get(0).scrollIntoView({ behavior: 'smooth' }); // scroll cell into view
                    $cell.one('animationend', function() {
                        $cell.removeClass('edit-select'); // cleanup
                    });
                    $cell.addClass('edit-select'); // commence highlight animation
                });
        }
    };

    Dashboard.prototype._removeGridControls = function($cell) {
        $cell.find('.grid-control-nw').remove();
    };

    Dashboard.prototype._initVisibleCell = function($cell, layout) {
        if (layout) {
            var computedLayout;
            if (!layout.width || !layout.height) {
                computedLayout = this._computeCellDimensions($cell);
            }
            var width = layout.width || computedLayout.width;
            var height = layout.height || computedLayout.height;

            $cell
                .attr('data-gs-x', layout.col)
                .attr('data-gs-y', layout.row)
                .attr('data-gs-width', width)
                .attr('data-gs-height', height);
        }
        $cell
            .addClass('grid-stack-item')
            .attr('data-gs-min-height', this.opts.minCellHeight);
    };

    Dashboard.prototype._compute_cell_dim = function($cell, defaultX, defaultY) {
        var self = this;
        var selectors = ['.text_cell_render', '.output', '.widget-area'];
        var computedY = selectors.map(function(selector) {
                var elem = $cell.find(selector).get(0);
                var outerHeight = elem ? elem.offsetHeight : 0; //$cell.find(selector).outerHeight();
                return outerHeight ?
                    Math.ceil((outerHeight + self.opts.gridMargin) / (self.opts.rowHeight + self.opts.gridMargin)) : 0;
            })
            .reduce(function(prev, y) {
                return prev + y;
            }, 0);
        var y = Math.max(computedY, defaultY);

        var computedX = selectors.map(function(selector) {
                var maxWidth = $cell.find(selector + ' *').toArray().reduce(function(prev, elem) {
                    return Math.max(prev, elem.offsetWidth);
                }, 0);
                return Math.ceil((maxWidth + self.opts.gridMargin) / (self._cellMinWidthPX + self.opts.gridMargin));
            })
            .reduce(function(prev, x) {
                return Math.max(prev, x);
            });
        var x = Math.max(computedX, defaultX);

        return {
            width: x,
            height: y,
            isEmpty: computedY === 0 || computedX === 0 // If cell has no visible output
        };
    };

    /**
     * Computes the minimum number of rows & columns needed to show the specified cells contents.
     * @param  {jQuery} $cell - Cell to measure
     * @param  {Object} [constraints] - Fix one of the dimensions, only calculate the other
     * @param  {number} [constraints.width] - Fix width to given number of columns
     * @param  {number} [constraints.height] - Fix height to given number of rows
     * @return {Object} Object of the form:
     *                     {
     *                         width: <number of columns>,
     *                         height: <number of rows>,
     *                         isEmpty: <true if cell has no visible contents, else false>
     *                     }
     */
    Dashboard.prototype._computeCellDimensions = function($cell, constraints) {
        constraints = typeof constraints === 'undefined' ? {} : constraints;
        var x = constraints.width || this.opts.defaultCellWidth;
        var y = constraints.height || this.opts.defaultCellHeight;
        $cell.css({
            width: x * (this._cellMinWidthPX + this.opts.gridMargin) - this.opts.gridMargin,
            height: y * (this.opts.rowHeight + this.opts.gridMargin) - this.opts.gridMargin,
            transition: 'none', // disable transitions to allow proper width/height calculations
            display: 'block' // override `display:flex` set by Notebook CSS to allow proper calcs
        });

        var dim = this._compute_cell_dim($cell, x, y);

        // for text cells, if they are taller than the default, recalculate with max width
        if ($cell.hasClass('text_cell') && dim.height > y) {
            $cell.css({ width: this.opts.numCols * this._cellMinWidthPX });
            dim = this._compute_cell_dim($cell, this.opts.numCols, y);
        }

        $cell.css({ width: '', height: '', transition: '', display: '' });
        return dim;
    };

    Dashboard.prototype._saveGrid = function() {
        // save each cell's metadata
        var widgetData = _.map($('.grid-stack .cell.grid-stack-item:visible'), function (el) {
            el = $(el);
            var node = el.data('_gridstack_node');
            return {
                col: node.x,
                row: node.y,
                width: node.width,
                height: node.height
            };
        });

        var self = this;
        $('.cell.grid-stack-item').each(function(idx) {
            var layout = $.extend({}, widgetData[idx]);  // clone `data` object
            self._updateCellMetadata($(this), layout);
        });

        IPython.notebook.set_dirty(true);
    };

    Dashboard.prototype._onResize = function(node) {
        if (typeof this.opts.onResize === 'function') {
            this.opts.onResize(node);
        }
    };

    Dashboard.prototype._hideCell = function($cell) {
        var self = this;
        this.$container.one('change', function() {
            $cell.resizable('destroy');
            $cell.draggable('destroy');
            self._updateCellMetadata($cell, null);
            // Temporarily set 'top' *before* removing 'grid-stack-item' class. This makes it so
            // cell animates when moving from dashboard to hidden cells area.
            $cell.css({
                top: $cell.css('top'),
                left: $cell.css('left')
            });
            $cell.removeClass('grid-stack-item');
            self._repositionHiddenCells();
            self.$hiddenHeader.removeClass('hidden');

            // When transitioning to the hidden area, the content of a cell may change size (as the
            // cell's width increases). We need to recalculate the cell offsets after the
            // transition has finished.
            $cell.one('transitionend', function() {
                self._onResize($cell.get(0));
                self._repositionHiddenCells();
            });
        });
        this.gridstack.remove_widget($cell, false /* don't detach node */);
    };

    // move cell from hidden table to main grid
    Dashboard.prototype._showCell = function($cell, constraints) {
        // compute correct dimensions (taking into account any given `constraints`)
        var dim = this._computeCellDimensions($cell, constraints);

        this.gridstack.add_widget($cell, 0, 0, dim.width, dim.height, true, false /* attach_node */);
        this._initVisibleCell($cell);
        // remove classes added by _hideCell()
        $cell.css({
            top: '',
            left: ''
        });

        // notify contents that cell may have been resized
        var self = this;
        $cell.one('transitionend', function() {
            self._onResize($cell.get(0));
        });

        if (this.$container.find('.cell:not(.grid-stack-item)').length === 0) {
            this.$hiddenHeader.addClass('hidden');
        }
        // wait for Gridstack to finish resizing before recalculating positions of hidden cells
        this.$container.one('transitionend', this._repositionHiddenCells.bind(this));

        // update metadata
        var grid = $cell.data('_gridstack_node');
        var layout = {
            col: grid.x,
            row: grid.y,
            width: grid.width,
            height: grid.height
        };
        this._updateCellMetadata($cell, layout);
    };

    Dashboard.prototype._toggleHiddenCellCode = function(event) {
        this.$container.toggleClass('show-code');
        var $button = $(event.target);
        $button.toggleClass('btn-info');
        $button.text($button.text() === 'Show code' ? 'Hide code' : 'Show code');
        this._repositionHiddenCells();
    };

    /**
     * Move all cells into the dashboard view
     */
    Dashboard.prototype.showAllCells = function() {
        var self = this;
        this.$container
            .find('.cell:not(.grid-stack-item)')
            .each(function() {
                self._showCell($(this));
            });
        IPython.notebook.set_dirty(true);
    };

    /**
     * Remove all cells from the dashboard view. Cells will be shown in the 'hidden' container.
     */
    Dashboard.prototype.hideAllCells = function() {
        var self = this;
        this.$container
            .find('.cell.grid-stack-item')
            .each(function() {
                self._hideCell($(this));
            });
        IPython.notebook.set_dirty(true);
    };

    /**
     * Set dashboard to allow draggging/resizing/showing/hiding or enable static mode.
     * @param  {boolean} doEnable   if `false`, sets dashboard to static mode
     */
    Dashboard.prototype.setInteractive = function(args) {
        this._loaded.then(function() {
            this.gridstack.set_static(!args.enable);
            this.gridstack.set_animation(args.enable);
            this.interactive = !!args.enable;

            if (args.enable) {
                this.gridstack.enable(); // enable widgets moving/resizing
                $(window).on('keydown.Dashboard keyup.Dashboard', this._onShiftKey.bind(this));
                this._repositionHiddenCells();
            } else {
                this.gridstack.disable(); // disable widgets moving/resizing
                $(window).off('keydown.Dashboard keyup.Dashboard');
                $('#notebook').css('height', ''); // clear the notebook height
            }

            if (typeof args.complete === 'function') {
                // call `complete` asynchronously, since we need to let Gridstack to finish
                // fully rendering
                setTimeout(args.complete, 0);
            }
        }.bind(this));
    };

    // when shift key is held down (only in Dashboard Layout), allow dragging from full cell body
    Dashboard.prototype._onShiftKey = function(e) {
        var allCellDragEnable = e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
        $(document.body).toggleClass('all_cell_drag', allCellDragEnable);
        // set draggable area to either full cell or the smaller drag handle
        var handle = allCellDragEnable ? '.dashboard-item-border' : DRAG_HANDLE;
        this.$container.find('> .grid-stack-item').draggable('option', 'handle', handle);
    };

    /**
     * Delete dashboard resources
     */
    Dashboard.prototype.destroy = function() {
        $(window).off('resize.Dashboard keydown.Dashboard keyup.Dashboard');

        this.gridstack.removeStylesheet();
        this.gridstack.destroy(false /* detach_node */);
        this.$container.removeData('gridstack'); // remove stored instance, so we can re-init

        // remove all 'data-gs-*' attributes from cells
        this.$container.find('> .cell').each(function() {
            var attrs = this.attributes;
            var toRemove = [];
            for (var attr in attrs) {
                if (typeof attrs[attr] === 'object' &&
                        typeof attrs[attr].name === 'string' &&
                        (/^data-gs/).test(attrs[attr].name)) {
                    toRemove.push(attrs[attr].name);
                }
            }
            for (var i = 0; i < toRemove.length; i++) {
                this.removeAttribute(toRemove[i]);
            }
        });

        // remove all 'grid-stack-*' class names from container
        this.$container.attr('class', function(idx, className) {
            return className.split(' ')
                .filter(function(val) {
                    return !/^grid-stack-/.test(val);
                })
                .join(' ');
        });

        $('.grid-stack-item')
                .resizable('destroy').draggable('destroy')
                .removeClass('ui-resizable-autohide'); // jquery bug, cannot remove class using API

        $('.dashboard-item-background').remove();
        $('.dashboard-item-border').remove();

        $('.grid-stack').removeClass('grid-stack');
        $('.grid-stack-item').removeClass('grid-stack-item');
        $('.grid-control-container').remove();
        this.$hiddenHeader.remove();
        $('#notebook').css('height', '');
        $('#notebook-container').css('width', '').css('height', '');
        $('body').removeClass('urth-dashboard');
    };

    return {
        /**
         * Instantiate the Dashboard view.
         * @param  {DomNode|jQuery} opts.container  element on which to create Dashboard grid
         * @param  {number} opts.numCols            number of columns for the grid
         * @param  {number} opts.rowHeight          height (in px) of the grid rows
         * @param  {number} opts.gridMargin         size (in px) of margin between cells in grid
         * @param  {number} opts.defaultCellWidth   default width (in number of columns) of cells
         * @param  {number} opts.defaultCellHeight  default height (in number of rows) of cells
         * @param  {number} opts.minCellHeight      minimum height (in number of rows) that cell
         *                                          can occupy
         * @param  {Function} opts.exit             callback which is invoked when the Dashboard
         *                                          initiates exiting from Dashboard Mode (for
         *                                          example, if user clicks on cell edit button to
         *                                          go back to Notebook view)
         *
         * @return {Dashboard}      instance of Dashboard
         */
        create: function(opts) {
            return new Dashboard(opts);
        }
    };
});
