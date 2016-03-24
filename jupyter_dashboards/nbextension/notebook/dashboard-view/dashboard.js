/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

define([
    'jquery',
    'lodash',
    'base/js/namespace',
    'urth-common/error-log',
    '../link-css',
    './dashboard-metadata',
    'text!./grid-controls.html',
    'urth-common/gridstack-custom' // jquery plugin: return value not used
], function(
    $,
    _,
    IPython,
    ErrorLog,
    linkCSS,
    Metadata,
    gridControlsTemplate
) {
    'use strict';

    var cssLoaded = false;
    var idCounter = 0;

    var HIDDEN_CELLS_MARGIN = 10;
    var HIDDEN_CELLS_BOTTOM_MARGIN = 20;

    var DRAG_HANDLE = '.drag-handle';
    var SCROLL_EDGE_DISTANCE = 30;
    var MAX_SCROLL_SPEED = 20;

    var Dashboard = function(opts) {
        this.$container = $(opts.container);
        this.scrollContainer = $(opts.scrollContainer).get(0);
        this.opts = opts;
        this._loaded = $.Deferred();

        ErrorLog.enable(IPython);

        if (!cssLoaded) {
            cssLoaded = [
                linkCSS('./bower_components/gridstack/dist/gridstack.css'),
                linkCSS('./dashboard-common/gridstack-overrides.css'),
                linkCSS('./dashboard-common/dashboard-common.css'),
                linkCSS('./dashboard-view/dashboard-view.css')
            ];
        }

        // Must wait for CSS to be evaluated before we generate the grid. Otherwise, positioning
        // is calculated incorrectly.
        $.when.apply(null, cssLoaded).then(function() {
            $('body').addClass('urth-dashboard');
            var nolayout = this._addMetadataToDom(); // returns cells that don't have metadata

            var self = this;
            this.$container.children().each(function() {
                self._addGridControls($(this));
            });

            this._createHiddenHeader();
            this._enableGridstack();
            this._calcCellWidth(); // now that Gridstack has been enabled

            // add the cells without grid layout to Gridstack
            Promise.all(nolayout.map(this._addNotebookCellToDashboard.bind(this)))
                .then(this._showHiddenArea.bind(this));

            // save to update any metadata changes made by grid constraints
            Metadata.save();

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

            var layout = Metadata.getCellLayout(el);
            if (Metadata.isCellVisible(el)) {
                if (layout) {
                    self._initVisibleCell(el, layout);
                } else {
                    nolayout.push($(this)); // cell doesn't have layout info; save for later
                }
            }
        });
        return nolayout;
    };

    Dashboard.prototype._enableGridstack = function() {
        var handles = this.opts.reportLayout ? 's' : 'e, se, s, sw, w';
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
                    handle: DRAG_HANDLE
                },
                resizable: {
                    handles: handles
                }
            })
            .on('dragstop resizestop', function() {
                window.clearInterval(this.scrollInterval);
                Metadata.save();
            }.bind(this))
            .on('dragstart dragstop', function(event) {
                $('body').toggleClass('dragging', event.type === 'dragstart');
                this.dragStartYOffset = event.clientY + this.scrollContainer.scrollTop -
                    this.scrollContainer.offsetTop - this.$container.position().top -
                    event.target.offsetTop;
            }.bind(this))
            .on('drag', function(event, ui) {
                // always force the y-position relative to the mouse cursor
                // because edge scrolling breaks the positioning
                ui.position.top = event.clientY + this.scrollContainer.scrollTop -
                    this.scrollContainer.offsetTop - this.$container.position().top -
                    this.dragStartYOffset;
                this._scrollOnEdgeDrag(event.clientY, event.target);
            }.bind(this))
            .data('gridstack');

        if (typeof this.opts.onResize === 'function') {
            var self = this;
            this.$container.on('dragstop resizestop', function(event, ui) {
                self.opts.onResize(event.target);
                self._repositionHiddenCells();
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

            // reduce width of input to account for cell margin
            {
                selector: '.grid-stack .grid-stack-item.cell > .input',
                rules: 'width: calc(100% - ' + (halfMargin * 2) + 'px);'
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

    Dashboard.prototype._scrollOnEdgeDrag = function(yPos, dragTarget) {
        dragTarget = $(dragTarget);
        var distanceFromTop = yPos - this.scrollContainer.offsetTop;
        var distanceFromBottom = this.scrollContainer.offsetTop + this.scrollContainer.offsetHeight - yPos;

        // Step 1: enable/disable scrolling
        if ((distanceFromTop <= SCROLL_EDGE_DISTANCE ||
                distanceFromBottom <= SCROLL_EDGE_DISTANCE) &&
                !this.isScrolling) {
            // activate scrolling
            this.isScrolling = true;
            this.scrollAmount = 0;
            this.scrollInterval = window.setInterval(function() {
                this.scrollContainer.scrollTop += this.scrollAmount;
                dragTarget.css('top', parseInt(dragTarget.css('top')) + this.scrollAmount + 'px');
            }.bind(this), 16);
        } else if (distanceFromTop > SCROLL_EDGE_DISTANCE &&
                distanceFromBottom > SCROLL_EDGE_DISTANCE &&
                this.isScrolling) {
            // deactivate scrolling
            this.isScrolling = false;
            window.clearInterval(this.scrollInterval);
            delete this.scrollInterval;
            this.scrollAmount = 0;
        }

        // Step 2: set scrolling speed
        if (this.isScrolling) {
            // scrolling is happening so compute the scroll speed
            var direction = 1; // default to scroll down
            if (distanceFromTop <= SCROLL_EDGE_DISTANCE) {
                direction = -1; // scroll up
            }
            var distance = Math.min(distanceFromTop, distanceFromBottom);
            this.scrollAmount = direction * Math.min(1, (1 - distance / SCROLL_EDGE_DISTANCE)) * MAX_SCROLL_SPEED;
        }
    };

    Dashboard.prototype._repositionHiddenCells = function() {
        if (!this.interactive || this.$hiddenHeader.is('.hidden')) {
            return;
        }
        console.log('REPOSITION HIDDEN CELLS');

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

    Dashboard.prototype._showHiddenArea = function() {
        // show hidden cells if appropriate
        if (this.$container.find('.cell:not(.grid-stack-item)').length > 0) {
            this.$hiddenHeader.removeClass('hidden');
            this._repositionHiddenCells();
        }
    };

    Dashboard.prototype._createHiddenHeader = function() {
        this.$hiddenHeader = $('<div id="dashboard-hidden-header" class="container hidden"/>');
        var $header = $('<div class="header"/>')
            .appendTo(this.$hiddenHeader)
            .append('<h2 class="title">Hidden Cells</h2>');
        this.$hiddenHeader.insertAfter(this.$container); // add to DOM
    };

    // For a given DOM element, return the Notebook cell which contains it. Works with both
    // Notebook and "hidden" cells.
    Dashboard.prototype._getParentCell = function(elem) {
        var $elem = $(elem);
        var $parent = $elem.parents('.cell').first();
        return $parent;
    };

    Dashboard.prototype._addGridControls = function($cell) {
        var self = this;
        if ($cell.find('.grid-control-nw').length === 0) {
            var gc = $(gridControlsTemplate).appendTo($cell);
            gc.find('.close-btn').click(function() {
                    self._hideCell(self._getParentCell(this));
                });
            gc.find('.add-btn-bottom').click(function() {
                    // show a cell full width on bottom of dashboard
                    self._showCell(self._getParentCell(this), { width: self.opts.numCols });
                });
            gc.find('.add-btn-top').click(function() {
                    // show a cell full width on top of dashboard
                    self._showCell(self._getParentCell(this), { width: self.opts.numCols }, 0);
                });
            gc.find('.add-btn-relative').click(function() {
                    // show a cell full width relative to notebook position
                    var $cell = self._getParentCell(this);
                    var $prevCell = $cell.prevAll('.grid-stack-item').first();
                    var prevCellY = Number($prevCell.attr('data-gs-y'));
                    var prevCellHeight = Number($prevCell.attr('data-gs-height'));
                    var insertRow = (prevCellY + prevCellHeight) || 0; // use 0 if NaN
                    self._showCell($cell, { width: self.opts.numCols }, insertRow);
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

    Dashboard.prototype._initVisibleCell = function($cell, layout) {
        if (layout) {
            var computedLayout;
            if (!layout.width || !layout.height) {
                computedLayout = this._computeCellDimensions($cell);
            }
            var width = layout.width || computedLayout.width;
            var height = layout.height || computedLayout.height;

            $cell.attr('data-gs-width', width)
                 .attr('data-gs-height', height);

            if (layout.hasOwnProperty('col') && layout.hasOwnProperty('row')) {
                $cell.attr('data-gs-x', layout.col)
                     .attr('data-gs-y', layout.row);
            } else {
                // use cell index to cause Gridstack's auto position to use notebook order
                var index = $cell.index();
                $cell.attr('data-gs-x', index)
                     .attr('data-gs-y', index)
                     .attr('data-gs-auto-position', '1');
            }
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
        var w = constraints.width || this.opts.defaultCellWidth;
        var h = constraints.height || this.opts.defaultCellHeight;
        $cell.css({
            width: w * (this._cellMinWidthPX + this.opts.gridMargin) - this.opts.gridMargin,
            height: h * (this.opts.rowHeight + this.opts.gridMargin) - this.opts.gridMargin,
            transition: 'none', // disable transitions to allow proper width/height calculations
            display: 'block' // override `display:flex` set by Notebook CSS to allow proper calcs
        });

        var dim = this._compute_cell_dim($cell, w, h);

        // for text cells, if they are taller than the default, recalculate with max width
        if ($cell.hasClass('text_cell') && dim.height > h) {
            $cell.css({ width: this.opts.numCols * this._cellMinWidthPX });
            dim = this._compute_cell_dim($cell, this.opts.numCols, h);
        }

        $cell.css({ width: '', height: '', transition: '', display: '' });
        return dim;
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
            Metadata.hideCell($cell);
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

    // computes metadata for a cell that doesn't have grid layout metadata
    Dashboard.prototype._addNotebookCellToDashboard = function($cell) {
        var dim = this._computeCellDimensions($cell);
        return dim.isEmpty ? Promise.resolve() : this._showCell($cell);
    };

    // move cell from hidden table to main grid
    Dashboard.prototype._showCell = function($cell, constraints, row) {
        // determine if the cell is hidden
        var isHidden = !$cell.is('.grid-stack-item');
        var self = this;
        this._initVisibleCell($cell);

        var cellAddedPromise = $.Deferred();
        if (isHidden) {
            // compute correct dimensions (taking into account any given `constraints`)
            var dim = this._computeCellDimensions($cell, constraints);
            // if hidden, add the cell to the grid and position it
            // set y-position based on row, default to auto if row not specified
            var attrs = {
                'data-gs-width': dim.width,
                'data-gs-height': dim.height,
            };
            if (row >= 0) {
                attrs['data-gs-x'] = 0;
                attrs['data-gs-y'] = Number(row);
                attrs['data-gs-auto-position'] = null;
            } else {
                attrs['data-gs-auto-position'] = 1;
            }
            $cell.attr(attrs);

            // add widget to Gridstack, reject if it takes too long
            var rejectTimeout = window.setTimeout(function() {
                cellAddedPromise.reject('Timeout waiting for Gridstack to add widget', $cell);
            }, 10000);
            var onChange = function(event, elements) {
                if (elements.some(function(el) { return el.el.is($cell); })) {
                    cellAddedPromise.resolve($cell);
                    window.clearTimeout(rejectTimeout);
                    self.gridstack.container.off('change', onChange);
                }
            };
            this.gridstack.container.on('change', onChange);
            this.gridstack.make_widget($cell);

            $cell.css({ top: '', left: '' }); // remove classes added by _hideCell()
            if (this.$container.find('.cell:not(.grid-stack-item)').length === 0) {
                this.$hiddenHeader.addClass('hidden');
            }
        } else {
            // if already visible, move it to the desired position
            var y = row;
            if (row < 0 || row === undefined) {
                y = Math.max.apply(null, $('.grid-stack-item').map(function(i, el) {
                    return Number($(el).attr('data-gs-height')) +
                           Number($(el).attr('data-gs-y'));
                }));
            }
            this.gridstack.move($cell, null, y);
            cellAddedPromise.resolve($cell);
        }

        var cellTransitionEnd = new $.Deferred();
        var containerTransitionEnd = new $.Deferred();

        // notify contents that cell may have been resized
        $cell.one('transitionend', function() {
            self._onResize($cell.get(0));
            cellTransitionEnd.resolve();
        });

        // wait for both Gridstack and added cell to finish resizing before
        // recalculating positions of hidden cells.
        this.$container.one('transitionend',
            containerTransitionEnd.resolve.bind(containerTransitionEnd));
        $.when(cellTransitionEnd, containerTransitionEnd, cellAddedPromise)
            .then(this._repositionHiddenCells.bind(this));

        // update all cell metadata as placement may have displaced some cells
        Metadata.showCell($cell);
        Metadata.save();

        return cellAddedPromise;
    };

    Dashboard.prototype._showAllCells = function(constraints) {
        var self = this;
        this.hideAllCells();
        this.$container
            .find('.cell:not(.grid-stack-item)')
            .each(function() {
                self._showCell($(this), constraints);
            });
        IPython.notebook.set_dirty(true);
    };

    /**
     * Move all cells into the dashboard view in a packed layout
     */
    Dashboard.prototype.showAllCellsPacked = function() {
        this._showAllCells();
    };

    /**
     * Move all cells into the dashboard view in a stacked layout
     */
    Dashboard.prototype.showAllCellsStacked = function() {
        this._showAllCells({ width : this.opts.numCols });
    };

    /**
     * Remove all cells from the dashboard view. Cells will be shown in the 'hidden' container.
     */
    Dashboard.prototype.hideAllCells = function() {
        var self = this;
        this.$container.find('.cell.grid-stack-item').each(function() {
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
                // call `complete` async to let Gridstack finish rendering
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
