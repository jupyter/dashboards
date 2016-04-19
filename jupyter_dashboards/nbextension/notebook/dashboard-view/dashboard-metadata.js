/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
/**
 * This module provides an API to manage notebook dashboard layout cell metadata.
 */
/*************
    Dashboard metadata structure:
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
    'base/js/namespace'
], function(
    $,
    IPython
) {
    'use strict';

    var CELL_PROPERTIES = ['col','row','width','height'];

    // must match `dashboard-actions` auth states
    var DASHBOARD_LAYOUT = Object.freeze({
        GRID: 'grid',
        REPORT: 'report'
    });

    // pull cell metadata from element data
    function _getCellMetadata($elem) {
        if (!$elem.is('.cell')) {
            $elem = $elem.parents('.cell').first();
        }
        if ($elem.length > 0) {
            var metadata = $elem.data('cell').metadata;
            return metadata &&
                   metadata.urth &&
                   metadata.urth.dashboard;
        }
    }

    function _createEmptyUrthMetadata(cell, preserveExistingMetadata) {
        var metadata = IPython.notebook.metadata;
        if (cell) {
            metadata = $(cell).data('cell').metadata;
        }
        if (preserveExistingMetadata) {
            metadata.urth = metadata.urth || {};
            metadata.urth.dashboard = metadata.urth.dashboard || {};
        } else {
            metadata.urth = {
                dashboard: {}
            };
        }
        return metadata;
    }

    function _getDashboardLayout() {
        var metadata = _getDashboardMetadata();
        var layout = null;
        if (metadata && metadata.layout) {
            layout = metadata.layout;
        }
        return layout;
    }

    function _getDashboardMetadata() {
        var metadata = IPython.notebook.metadata;
        if (metadata.hasOwnProperty('urth') &&
            metadata.urth.hasOwnProperty('dashboard')) {
            return metadata.urth.dashboard;
        }
    }

    /**
     * Sets default values in the metadata if not set.
     * @param  {Object} values - values to set
     */
    function _setDefaultValues(values) {
        if (typeof values === 'object') {
            var metadata = _getDashboardMetadata();
            var valuesCopy = $.extend({}, values); // make a copy since we will modify
            $.extend(valuesCopy, metadata); // lay existing on top of default values
        } else {
            throw new Error('Metadata values must be an object:', values);
        }
    }

    // creates empty dashboard metadata if necessary
    function _initMetadata(opts) {
        // create empty notebook metadata (will wipe out any existing metadata)
        var preserveExistingMetadata = _getDashboardLayout() === opts.dashboardLayout;
        _createEmptyUrthMetadata(null, preserveExistingMetadata);

        // add default notebook metadata values
        _setDefaultValues(opts);

        // create empty cell metadata if it doesn't exist
        $('.cell').each(function() {
            _createEmptyUrthMetadata(this, preserveExistingMetadata);
        });
    }

    function _removePosition() {
        IPython.notebook.get_cells().forEach(function(cell, i) {
            var layout = cell.metadata.urth.dashboard.layout;
            if (layout) {
                delete layout.col;
                delete layout.row;
            }
        });
    }

    // copy dashboard layout information into each cell's metadata
    function _saveGrid() {
        $('.grid-stack .cell').each(function (i) {
            var el = $(this);
            if (el.is('.grid-stack-item')) {
                // add gridstack layout data to cell metadata
                var node = el.data('_gridstack_node');
                _updateCellMetadata(el, {
                    col: node.x,
                    row: node.y,
                    width: node.width,
                    height: node.height
                });
            } else {
                // add hidden metadata to cell
                _updateCellMetadata(el, null);
            }
        });
        IPython.notebook.set_dirty(true);
    }

    function _showCell(cells) {
        $(cells).each(function() {
            var metadata = _getCellMetadata($(this));
            metadata.layout = {};
            delete metadata.hidden;
        });
    }

    function _updateCellMetadata($cells, layout) {
        if (arguments.length === 1) {
            layout = $cells; // first argument is optional
            $cells = $('.cell');
        } else {
            $cells = $($cells); // force to jquery
        }

        $cells.each(function(i, cell) {
            var metadata = _getCellMetadata($(cell));

            // only update the layout if not hidden
            if (layout && !metadata.hidden) {
                metadata.layout = metadata.layout || {};
                CELL_PROPERTIES.forEach(function(prop) {
                    if (layout.hasOwnProperty(prop)) {
                        metadata.layout[prop] = layout[prop];
                    }
                });
            } else {
                delete metadata.layout;
                metadata.hidden = true;
            }
        });
        IPython.notebook.set_dirty(true);
    }

    function _validValue(obj, value) {
        return Object.keys(obj).map(function(key) {
                return obj[key];
            }).indexOf(value) !== -1;
    }

    return {
        get DASHBOARD_LAYOUT() { return DASHBOARD_LAYOUT; },

        /**
         * @return {string} dashboard layout type (defaults to grid layout if not set)
         *//**
         * Sets the specified dashboard layout in the notebook metadata
         * @param {string} layout - desired dashboard layout
         */
        get dashboardLayout() {
            return _getDashboardLayout();
        },
        set dashboardLayout(dbLayout) {
            if (_validValue(DASHBOARD_LAYOUT, dbLayout)) {
                var currentLayout = _getDashboardLayout();
                var preserveExistingMetadata = currentLayout === dbLayout ||
                                               currentLayout === null;

                _createEmptyUrthMetadata(null, preserveExistingMetadata)
                    .urth.dashboard.layout = dbLayout;

                if (!preserveExistingMetadata) {
                    // clear out cell metadata
                    $('.cell').each(function() {
                        _createEmptyUrthMetadata(this);
                    });
                }
            } else {
                throw new Error('Invalid dashboard layout:', dbLayout);
            }
        },

        /**
         * @param  {jQuery} $cell - notebook cell or element inside a notebook cell
         * @return {Object} layout positioning for the specified cell
         */
        getCellLayout: function($cell) {
            var metadata = _getCellMetadata($cell);
            return metadata && metadata.layout;
        },
        /**
         * Update a cell's metadata so it does not appear in the dashboard.
         * @param {(DOM Element|DOM Element[]|jQuery)} $cell - one or more notebook cells to hide
         */
        hideCell: function($cell) {
            _updateCellMetadata($cell, null);
        },
        /**
         * Populates the notebook metadata with empty dashboard metadata
         */
        initialize: _initMetadata,
        /**
         * @param {jQuery} $cell - notebook cell or element inside a notebook cell
         * @return {boolean} true if the cell is visible, else false
         */
        isCellVisible: function($cell) {
            var metadata = _getCellMetadata($cell);
            return metadata && !metadata.hidden;
        },
        /**
         * Copies layout data from the dashboard to the notebook metadata
         */
        save: _saveGrid,
        /**
         * Shows the specified cells. Adds an empty layout object.
         * The layout can be subsequently populated by calling `updateCellLayout`.
         * @type {(DOM Element|DOM Element[]|jQuery)} cells - one or more cells to show
         */
        showCell: _showCell,
        /**
         * Stacks the cells in notebook order. Keeps hidden cells hidden.
         */
        stackCells: _removePosition,
        /**
         * Update the specified cell's layout metadata
         * @param {(DOM Element|DOM Element[]|jQuery)} $cell - one or more notebook cells to update
         */
        updateCellLayout: _updateCellMetadata
    };
});
