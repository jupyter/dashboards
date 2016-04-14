/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
define([
    'jquery',
    '../../../link-css',
    '../../dashboard-metadata',
    '../../notebook-util',
    'template!./cell-controls.html',
    'template!./collapse-button.html'
], function(
    $,
    linkCSS,
    Metadata,
    nbUtil,
    $cellControlsTemplate,
    $collapseButtonTemplate
) {
    'use strict';

    var cssLoaded = false;
    var $CONTAINER = $('#notebook-container');
    var SCROLL_CONTAINER = $('#site').get(0);

    function ReportLayout(opts) {
        this.opts = opts;

        if (!cssLoaded) {
            cssLoaded = [
                linkCSS('./dashboard-view/layout/report/layout.css')
            ];
        }

        // setup cells for report layout
        var self = this;
        $CONTAINER.find('.cell').each(function() {
            var $cell = $(this);

            // hide cell if empty
            if ($cell.height() === 0 && !Metadata.getCellLayout($cell)) {
                Metadata.hideCell($cell);
            }

            // set hidden state
            $cell.toggleClass('dashboard-hidden dashboard-collapsed', !Metadata.isCellVisible($cell));

            // add controle for hide, add, edit
            self._addCellControls($cell);

            self._updateCollapseBtns();
        });

        Metadata.initialize({
            dashboardLayout: Metadata.DASHBOARD_LAYOUT.REPORT
        });
    }

    ReportLayout.prototype._addCellControls = function($cell) {
        var self = this;
        if ($cell.find('.cell-control-nw').length === 0) {
            var gc = $cellControlsTemplate.clone().appendTo($cell);
            gc.find('.add-btn').click(function() {
                self._setCellVisibility(nbUtil.getParentCell(this), true);
            });
            gc.find('.edit-btn').click(function() {
                var $cell = nbUtil.getParentCell(this);
                self.opts.exit();
                nbUtil.editCell($cell);
            });
            gc.find('.hide-btn').click(function() {
                self._setCellVisibility(nbUtil.getParentCell(this), false);
            });
        }
    };

    ReportLayout.prototype._setCellVisibility = function($cell, visibility) {
        $cell.toggleClass('dashboard-hidden', !visibility);
        if (visibility) {
            Metadata.showCell($cell);
        } else {
            Metadata.hideCell($cell);
        }
        this._updateCollapseBtns();
    };

    ReportLayout.prototype._updateCollapseBtns = function() {
        // insert collapse button between adjacent visible and hidden cells
        $CONTAINER.find('.cell:not(.dashboard-hidden) + .cell.dashboard-hidden, .cell.dashboard-hidden:first-child')
            .each(function() {
                var $collapseBtn = $collapseButtonTemplate.clone().click(function() {
                    var $btn = $(this);
                    $btn.toggleClass('dashboard-collapsed');
                    $btn.nextUntil('.dashboard-report-collapse-btn', '.cell.dashboard-hidden')
                        .toggleClass('dashboard-collapsed', $btn.is('.dashboard-collapsed'));
                });
                $(this).before($collapseBtn);
                $collapseBtn.toggleClass('dashboard-collapsed',
                    $collapseBtn.next('.dashboard-hidden').is('.dashboard-collapsed'));
            });

        // remove out of place collapse buttons
        $CONTAINER.find('.dashboard-report-collapse-btn + .cell:not(.dashboard-hidden)')
            .prev().remove();
        $CONTAINER.find('.cell.dashboard-hidden + .dashboard-report-collapse-btn')
            .remove();

        // update collapse button groups
        $CONTAINER.find('.dashboard-report-collapse-btn').each(function() {
            var $btn = $(this);
            var $collapseGroup = $btn.nextUntil('.dashboard-report-collapse-btn',
                '.cell.dashboard-hidden');
            // update text of collapse buttons
            $btn.find('.dashboard-report-hidden-count').text($collapseGroup.length);
            $btn.find('.dashboard-report-collapse-text').attr('data-cell-count',
                $collapseGroup.length);
            // update hidden cell collapsed state
            $collapseGroup.toggleClass('dashboard-collapsed',
                $btn.is('.dashboard-collapsed'));
        });
    };

    /* PUBLIC API */

    ReportLayout.prototype.destroy = function() {
        $CONTAINER.find('.cell').removeClass('dashboard-hidden');
        $CONTAINER.find('.cell-control-container').remove();
        $CONTAINER.find('.dashboard-report-collapse-btn').remove();
    };
    ReportLayout.prototype.hideAllCells = function() {
        $CONTAINER.find('.cell').addClass('dashboard-hidden').each(function() {
            Metadata.hideCell($(this));
        });
        this._updateCollapseBtns();
    };
    ReportLayout.prototype.setInteractive = function() {
        // no-op since report interactivity can be done using CSS
    };
    ReportLayout.prototype.showAllCells = function() {
        $CONTAINER.find('.cell').removeClass('dashboard-hidden').each(function() {
            Metadata.showCell($(this));
        });
        this._updateCollapseBtns();
    };

    return {
        /**
         * @return {Object} helpText - text for dashboard help area
         * @return {String} helpText.snippet - summary text for report layout
         */
        get helpText() {
            return {
                snippet: 'Report Layout: Show/hide cells in notebook order to create your dashboard.'
            };
        },
        /**
         * Instantiate the report layout.
         * @param {Object} opts - layout options
         * @param {Function} opts.exit callback which is invoked when the Dashboard
         *                             initiates exiting from Dashboard Mode (for
         *                             example, if user clicks on cell edit button to
         *                             go back to Notebook view)
         * @return {ReportLayout} instance of ReportLayout
         */
        create: function(opts) {
            return new ReportLayout(opts);
        }
    };
});
