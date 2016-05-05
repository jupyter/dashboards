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

    function ReportLayout(opts) {
        this.opts = opts;
        this.$container = opts.$container;

        if (!cssLoaded) {
            cssLoaded = linkCSS('./dashboard-view/layout/report/layout.css');
        }

        Metadata.dashboardLayout = Metadata.DASHBOARD_LAYOUT.REPORT;

        $.when(cssLoaded).then(function() {
            // setup cells for report layout
            var self = this;
            this.$container.find('.cell')
                .css('min-height', '0px') // we detect empty cells by height
                .each(function() {
                    var $cell = $(this);

                    // hide cell if empty
                    if ($cell.height() === 0 && !Metadata.getCellLayout($cell)) {
                        Metadata.hideCell($cell);
                    } else {
                        // explicitly call show if we're not hiding when we initialize
                        Metadata.showCell($cell);
                    }

                    // set hidden state
                    $cell.toggleClass('dashboard-hidden dashboard-collapsed',
                        !Metadata.isCellVisible($cell));

                    // add controls for hide, add, edit
                    self._addCellControls($cell);

                    self._updateCollapseBtns();
                })
                .css('min-height','');
        }.bind(this));
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
        this.$container.find('.cell:not(.dashboard-hidden) + .cell.dashboard-hidden, .cell.dashboard-hidden:first-child')
            .each(function() {
                var $collapseBtn = $collapseButtonTemplate.clone()
                    .filter('.dashboard-report-collapse-btn')
                    .click(function() {
                        var $btn = $(this);
                        $btn.toggleClass('dashboard-collapsed');
                        $btn.nextUntil('.dashboard-report-collapse-btn', '.cell.dashboard-hidden')
                            .toggleClass('dashboard-collapsed', $btn.is('.dashboard-collapsed'));
                    });
                $(this).before($collapseBtn);

                // Set to collapsed if either of the next two cells is collapsed
                // This helps merge collapse groups
                $collapseBtn.toggleClass('dashboard-collapsed',
                    $collapseBtn.next().is('.dashboard-collapsed') ||
                    $collapseBtn.next().next().is('.dashboard-collapsed'));
            });

        // remove out of place collapse buttons
        this.$container.find('.dashboard-report-collapse-btn + .cell:not(.dashboard-hidden)')
            .prev().remove();
        this.$container.find('.cell.dashboard-hidden + .dashboard-report-collapse-btn')
            .remove();

        // update collapse button groups
        this.$container.find('.dashboard-report-collapse-btn').each(function() {
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
        this.$container.find('.cell').removeClass('dashboard-hidden dashboard-collapsed');
        this.$container.find('.cell-control-container').remove();
        this.$container.find('.dashboard-report-collapse-btn').remove();
    };
    ReportLayout.prototype.hideAllCells = function() {
        this.$container.find('.cell').addClass('dashboard-hidden').each(function() {
            Metadata.hideCell($(this));
        });
        this._updateCollapseBtns();
    };
    ReportLayout.prototype.setInteractive = function() {
        // no-op since report interactivity can be done using CSS
    };
    ReportLayout.prototype.showAllCells = function() {
        this.$container.find('.cell').removeClass('dashboard-hidden').each(function() {
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
         * @param {jQuery} opts.$container - notebook container
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
