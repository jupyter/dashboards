/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
/**
 * This module handles dashboard view menu and toolbar creation and actions.
 */
define([
    'jquery',
    'base/js/namespace',
    './dashboard-metadata',
    'text!./layout-toolbar-buttons.html',
    'text!./sub-menu.html',
    'text!./view-menu.html'
], function(
    $,
    IPython,
    Metadata,
    layoutToolbarBtnsTemplate,
    subMenuTemplate,
    viewMenuTemplate
) {
    'use strict';

    // DASHBOARD_AUTH_* states are saved in notebook metadata
    var STATE = {
        NOTEBOOK: 'notebook',
        DASHBOARD_AUTH_GRID: 'grid',
        DASHBOARD_AUTH_REPORT: 'report',
        DASHBOARD_PREVIEW: 'preview'
    };
    var currentState = STATE.NOTEBOOK;
    var toolbarBtnsSelector = '#urth-dashboard-view-toolbar-buttons';
    var isHeaderVisible = true, isToolbarVisible = true;
    var opts, scrollToBottom;

    function enterDashboardMode(newState) {
        opts.enterDbModeCallback(
            newState !== STATE.DASHBOARD_PREVIEW, // doEnableGrid
            newState === STATE.DASHBOARD_AUTH_REPORT
        );
        // disable scroll to bottom of notebook
        scrollToBottom = IPython.Notebook.prototype.scroll_to_bottom;
        IPython.Notebook.prototype.scroll_to_bottom = function() {};
    }

    function exitDashboardMode() {
        opts.exitDbModeCallback();
        // restore scrolling behavior
        IPython.Notebook.prototype.scroll_to_bottom = scrollToBottom;
        scrollToBottom = null;
    }

    function getFaIconClass(el) {
        return $(el).attr('class').split(' ').filter(function(value) {
            return /^fa-/.test(value);
        })[0];
    }

    function updateAuthoringBtn(state) {
        if (state !== STATE.NOTEBOOK &&
            state !== STATE.DASHBOARD_PREVIEW) {
            var $btns = $(toolbarBtnsSelector);
            var icon = getFaIconClass($btns.find(
                '.dashboard-layout-menu-item[data-dashboard-state="' + state + '"] i'));
            $btns.find('.dashboard-authoring-btn')
                .attr('data-dashboard-state', state)
                .find('.dashboard-authoring-icon')
                    .removeClass(function() {
                        return getFaIconClass(this);
                    })
                    .addClass(icon);
        }
    }

    function setDashboardState(newState) {
        if (newState !== currentState) {
            if (newState === STATE.NOTEBOOK) {
                exitDashboardMode();
            } else {
                enterDashboardMode(newState);
            }
            updateUIState(newState);
            currentState = newState;
        }
    }

    function setHeaderVisibility(doShow) {
        // if hiding, save current state
        if (!doShow) {
            isHeaderVisible = $('#header-container').is(':visible');
            isToolbarVisible = $('div#maintoolbar').is(':visible');
        }
        // hide or revert back to previous state
        $('#header-container, .header-bar').toggle(doShow && isHeaderVisible);
        $('div#maintoolbar').toggle(doShow && isToolbarVisible);
        IPython.notebook.events.trigger('resize-header.Page');
    }

    function setStateFromQueryString() {
        // set 'Dashboard View' state if 'dashboard' query parameter is set
        var idx = window.location.search.slice(1).split(/[&=]/).indexOf('dashboard');
        if (idx !== -1) {
            setDashboardState(STATE.DASHBOARD_PREVIEW);
        }
    }

    function updateUIState(state) {
        updateUrlState(state === STATE.DASHBOARD_PREVIEW);
        setHeaderVisibility(state !== STATE.DASHBOARD_PREVIEW);
        updateAuthoringBtn(state);

        // set view-only class if previewing the dashboard
        $('body').toggleClass('view-only', state === STATE.DASHBOARD_PREVIEW);

        // enable the correct button group and menu state items
        var activeBtn = $(toolbarBtnsSelector + ' button:not(.dropdown-toggle)[data-dashboard-state="' + state + '"]');
        if (activeBtn.is('.dashboard-authoring-btn')) {
            activeBtn = activeBtn.parent();
        }
        activeBtn.addClass('active').siblings().removeClass('active');
        $('#view_menu [data-dashboard-state]').each(function() {
            $(this).toggleClass('selected', state === $(this).attr('data-dashboard-state'));
        });

        // disable show/hide menu items when in preview state
        $('.dashboard-submenu-item').toggleClass('disabled', state === STATE.NOTEBOOK || state === STATE.DASHBOARD_PREVIEW);
        $('#urth-dashboard-show-all').toggleClass('disabled', state === STATE.NOTEBOOK || state === STATE.DASHBOARD_PREVIEW || state === STATE.DASHBOARD_AUTH_REPORT);

        // disable code editing when in a dashboard view
        $('.CodeMirror').each(function() {
            this.CodeMirror.setOption('readOnly', state === STATE.NOTEBOOK ? false : 'nocursor');
        });
    }

    function updateUrlState(inDashboardViewMode) {
        var l = window.location, s = l.search.slice(1);
        if (inDashboardViewMode) {
            if (s.split(/[&=]/).indexOf('dashboard') === -1) {
                s += (s.length ? '&' : '') + 'dashboard';
            }
        } else {
            var params = s.split('&');
            var idx = params.indexOf('dashboard');
            if (idx !== -1) {
                params.splice(idx, 1);
            }
            s = params.join('&');
        }
        var url = l.protocol + '//' + l.host + l.pathname + (s.length ? '?' + s : '');
        window.history.replaceState(null, null, url);
    }

    /*************************************/
    var DashboardActions = function(args) {
        opts = {
            enterDbModeCallback: args.enterDashboardMode,
            exitDbModeCallback: args.exitDashboardMode,
            showAllCallback: args.showAll,
            showAllStackedCallback: args.showAllStacked,
            hideAllCallback: args.hideAll
        };
        setStateFromQueryString();
    };

    DashboardActions.prototype.addMenuItems = function() {
        // Add view menu items and hook up click handlers to set state
        $('#view_menu').append('<li class="divider"/>', viewMenuTemplate)
            .find('[data-dashboard-state]')
                .click(function() {
                    setDashboardState($(this).attr('data-dashboard-state'));
                })
                .filter(function() {
                    return $(this).attr('data-dashboard-state') === currentState;
                }).addClass('selected'); // initial selected view menu item

        // Cell menu items to show/hide cells
        $('#cell_menu').append('<li class="divider"/>', subMenuTemplate);
        $('#urth-dashboard-show-all').click(opts.showAllCallback);
        $('#urth-dashboard-show-all-stacked').click(opts.showAllStackedCallback);
        $('#urth-dashboard-hide-all').click(opts.hideAllCallback);
    };

    DashboardActions.prototype.addToolbarItems = function() {
        // add toolbar buttons from template and add click handlers
        $(IPython.toolbar.selector).append(layoutToolbarBtnsTemplate);
        $(toolbarBtnsSelector + ' [data-dashboard-state]').click(function() {
            var el = $(this);
            var state = el.attr('data-dashboard-state');
            if (el.is('.dashboard-layout-menu-item')) {
                Metadata.dashboardLayout = state;
            }
            setDashboardState(state);
        });

        // update the UI based on initial state
        updateAuthoringBtn(Metadata.dashboardLayout);
        updateUIState(currentState);
    };

    DashboardActions.prototype.switchToNotebook = function() {
        setDashboardState(STATE.NOTEBOOK);
    };

    return DashboardActions;
});
