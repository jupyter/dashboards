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
        values = values || {};
        if (typeof values === 'object') {
            var metadata = _getDashboardMetadata();
            Object.keys(values).forEach(function(key) {
                // only copy values that are not already set in metadata
                if (!metadata.hasOwnProperty(key)) {
                    metadata[key] = values[key];
                }
            });
        } else {
            throw new Error('Metadata values must be an object:', values);
        }
    }

    // Ensures dashboard metadata exists and sets default notebook-level values.
    // Will clear out existing metadata if preserveExistingMetadata == true.
    function _initMetadata(opts, preserveExistingMetadata) {
        if (arguments.length < 2) {
            preserveExistingMetadata = true;
        }
        _createEmptyUrthMetadata(null, preserveExistingMetadata);
        _setDefaultValues(opts);
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
            // add a layout object to indicate that this cell has explicitly 
            // been added to the layout either by some initialization routine
            // that calculated the layout or the user
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
                // reset the layout object, but don't remove it completely
                // since it serves as the indicator that this cell has been
                // purposefully added to the layout in the past
                metadata.layout = {};
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
                _initMetadata({}, preserveExistingMetadata);
                _getDashboardMetadata().layout = dbLayout;
            } else {
                throw new Error('Invalid dashboard layout:', dbLayout);
            }
        },

        /**
         * @return {Object} top-level dashboard metadata values
         */
        get dashboardMetadata() {
            return _getDashboardMetadata();
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
