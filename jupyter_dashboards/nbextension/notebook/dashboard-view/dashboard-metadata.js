/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
/**
 * This module provides an API to manage Jupyter Dashboards extension metadata.
 *
 * Jupyter Dashboard metadata structure:
 *    https://github.com/jupyter-incubator/dashboards/wiki/Dashboard-Metadata-and-Rendering
 */
define([
    'jquery',
    'base/js/namespace',
    './object-util'
], function(
    $,
    IPython,
    ObjectUtil
) {
    'use strict';

    var SPEC_VERSION = 1;
    var GRID_DEFAULT = 'grid_default';
    var REPORT_DEFAULT = 'report_default';

    // must match `dashboard-actions.js` auth states
    var DASHBOARD_VIEW = Object.freeze({
        GRID: 'grid',
        REPORT: 'report'
    });

    // Mapping of view type to view id
    // This will change when multiple views of the same type are supported.
    var VIEW_TO_ID = {
        grid: GRID_DEFAULT,
        report: REPORT_DEFAULT
    };

    function _getActiveView() {
        var metadata = _getDashboardMetadata();
        if (metadata) {
            return metadata.activeView;
        }
    }

    /**
     * Returns view metadata from cell element data.
     * @param  {jQuery} $elem - notebook cell or child element of a notebook cell
     * @param  {string} [viewId] - View to get metadata for.
     *                             Defaults to the active view if viewId isn't specified.
     * @return {Object} view metadata
     */
    function _getCellViewMetadata($elem, viewId) {
        // use active view if not specified
        viewId = viewId || _getActiveView();
        if (!$elem.is('.cell')) {
            $elem = $elem.parents('.cell').first();
        }
        if ($elem.length > 0) {
            var metadata = $elem.data('cell').metadata;
            return metadata.extensions.jupyter_dashboards.views[viewId];
        }
    }

    function _createDashboardMetadata(cell) {
        var metadata = IPython.notebook.metadata;
        if (cell) {
            metadata = $(cell).data('cell').metadata;
        }

        // common metadata
        ObjectUtil.ensure(metadata, 'extensions.jupyter_dashboards.views');
        metadata.extensions.jupyter_dashboards.version = SPEC_VERSION;

        var views = metadata.extensions.jupyter_dashboards.views;
        ObjectUtil.ensure(views, GRID_DEFAULT);
        ObjectUtil.ensure(views, REPORT_DEFAULT);

        // notebook-level only metadata
        if (!cell) {
            views[GRID_DEFAULT].type = DASHBOARD_VIEW.GRID;
            views[REPORT_DEFAULT].type = DASHBOARD_VIEW.REPORT;

            // default names
            views[GRID_DEFAULT].name = DASHBOARD_VIEW.GRID;
            views[REPORT_DEFAULT].name = DASHBOARD_VIEW.REPORT;
        }

        return metadata;
    }

    function _getDashboardMetadata() {
        var metadata = IPython.notebook.metadata;
        if (ObjectUtil.has(metadata, 'extensions.jupyter_dashboards')) {
            return metadata.extensions.jupyter_dashboards;
        }
    }

    function _setDefaultGridProperties(props) {
        props = props || {};
        if (typeof props === 'object') {
            var metadata = _getDashboardMetadata().views[GRID_DEFAULT];
            Object.keys(props).forEach(function(key) {
                // only copy values that are not already set in metadata
                if (!metadata.hasOwnProperty(key)) {
                    metadata[key] = props[key];
                }
            });
        } else {
            throw new Error('Metadata properties must be an object:', props);
        }
    }

    // Ensures dashboard metadata exists and sets default notebook-level values.
    function _initMetadata() {
        _createDashboardMetadata();
        $('.cell').each(function() {
            _createDashboardMetadata(this);
        });
    }

    function _removeGridPositioning() {
        IPython.notebook.get_cells().forEach(function(cell, i) {
            var view = cell.metadata.extensions.jupyter_dashboards.views[GRID_DEFAULT];
            if (view) {
                delete view.col;
                delete view.row;
            }
        });
    }

    // copy grid layout information into each cell's view metadata
    function _saveGrid() {
        $('.grid-stack .cell').each(function (i) {
            var el = $(this);
            if (el.is('.grid-stack-item')) {
                // add gridstack layout data to cell metadata and show cell
                var node = el.data('_gridstack_node');
                _updateCellMetadata({
                    col: node.x,
                    row: node.y,
                    width: node.width,
                    height: node.height
                }, el, GRID_DEFAULT);
            } else {
                // add hidden metadata to cell
                _updateCellMetadata({ hidden: true }, el, GRID_DEFAULT);
            }
        });
        IPython.notebook.set_dirty(true);
    }

    function _updateCellMetadata(viewProps, $cells, viewId) {
        // force cells to jquery & use all cells if not specified
        $cells = $cells ? $($cells) : $('.cell');
        viewId = viewId || _getActiveView();

        $cells.each(function(i, cell) {
            $.extend(_getCellViewMetadata($(cell), viewId), viewProps);
        });
        IPython.notebook.set_dirty(true);
    }

    function _validValue(obj, value) {
        return Object.keys(obj).map(function(key) {
                return obj[key];
            }).indexOf(value) !== -1;
    }

    return {
        get DASHBOARD_VIEW() { return DASHBOARD_VIEW; },

        /**
         * @return {string} dashboard view type
         *//**
         * Sets the specified view in the notebook metadata
         * @param {string} view - desired dashboard view
         */
        get activeView() {
            // map default view id to view type
            var activeView = _getActiveView();
            return Object.keys(VIEW_TO_ID).filter(function(key) {
                return VIEW_TO_ID[key] === activeView;
            })[0];
        },
        set activeView(dbView) {
            if (_validValue(DASHBOARD_VIEW, dbView)) {
                _initMetadata();
                _getDashboardMetadata().activeView = VIEW_TO_ID[dbView];
            } else {
                throw new Error('Invalid dashboard view:', dbView);
            }
        },

        /**
         * @return {Object} top-level dashboard metadata values
         */
        get dashboardMetadata() {
            return _getDashboardMetadata();
        },

        /**
         * @return {Object} active view properties
         */
        get viewProperties() {
            return _getDashboardMetadata().views[_getActiveView()];
        },

        /**
         * @param  {jQuery} $cell - notebook cell or element inside a notebook cell
         * @return {Object} view positioning for the specified cell
         */
        getCellLayout: function($cell) {
            return _getCellViewMetadata($cell);
        },
        /**
         * @return {boolean} true if cell has been rendered in the active dashboard view
         */
        hasCellBeenRendered: function($cell) {
            return _getCellViewMetadata($cell).hasOwnProperty('hidden');
        },
        /**
         * Hide's a cell in the active view.
         * @param {(DOM Element|DOM Element[]|jQuery)} $cells - one or more notebook cells to hide
         */
        hideCell: function($cells) {
            _updateCellMetadata({ hidden: true }, $cells);
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
            return !_getCellViewMetadata($cell).hidden;
        },
        /**
         * Copies layout data from the dashboard to the notebook metadata
         */
        save: _saveGrid,
        /**
         * Mark a cell as being rendered. Some layouts may use this information
         * for performing operations on new cells, e.g. auto-hide.
         * @param  {jQuery} $cell - cell to mark rendered
         */
        setCellRendered: function($cell) {
            var view = _getCellViewMetadata($cell);
            view.hidden = !!view.hidden;
        },
        /**
         * Sets the specified grid view properties if they are not set
         * @type {Object} props - grid view properties and values
         */
        setDefaultGridProperties: _setDefaultGridProperties,
        /**
         * Shows the specified cells in the active view.
         * @type {(DOM Element|DOM Element[]|jQuery)} cells - one or more cells to show
         */
        showCell: function($cells) {
            _updateCellMetadata({ hidden: false }, $cells);
        },
        /**
         * Stacks the cells in notebook order. Keeps hidden cells hidden.
         */
        stackCells: _removeGridPositioning
    };
});
