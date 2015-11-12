/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
/* global console, requirejs */

/**
 * This module handles dashboard-view menu and toolbar creation and actions.
 */
define([
    'require',
    'jquery',
    'base/js/namespace',
    'text!./sub-menu.html',
    'text!./view-menu.html'
], function(
    require,
    $,
    IPython,
    subMenuTemplate,
    viewMenuTemplate
) {
    'use strict';

    var STATE_NOTEBOOK = 'nb';
    var STATE_DASHBOARD_AUTH = 'auth';
    var STATE_DASHBOARD_VIEW = 'view';
    var dashboardState = STATE_NOTEBOOK;

    var VIEW_BTN_IDX = {};
    VIEW_BTN_IDX[STATE_NOTEBOOK] = 1;
    VIEW_BTN_IDX[STATE_DASHBOARD_AUTH] = 2;
    VIEW_BTN_IDX[STATE_DASHBOARD_VIEW] = 3;

    var enterDbModeCallback;
    var exitDbModeCallback;
    var showAllCallback;
    var hideAllCallback;
    var scrollToBottom;

    function queryState() {
        var idx = window.location.search.slice(1).split(/[&=]/).indexOf('dashboard');
        if (idx !== -1) {
            // view-only mode
            toggleDashboardMode(STATE_DASHBOARD_VIEW);
        }
    }

    function toggleDashboardMode(newState) {
        if (dashboardState === newState) {
            // nothing to do; ignore
            return;
        }
        if (newState === STATE_NOTEBOOK) {
            exitDashboardMode();
        } else {
            enterDashboardMode(newState, dashboardState /* prev state */);
        }
        setViewButtonEnabled(newState);
        dashboardState = newState;
    }

    function exitDashboardMode() {
        // Revert changes done in enterDashboardMode()
        $('body').removeClass('view-only');
        $('#urth-notebook-view').addClass('selected');
        $('#urth-dashboard-auth, #urth-dashboard-view').removeClass('selected');
        $('#urth-dashboard-show-all, #urth-dashboard-hide-all').addClass('disabled');
        exitDbModeCallback();
        updateUrlState(false);
        toggleHeaders(true); // enable header and toolbar

        // restore scrolling behavior
        IPython.Notebook.prototype.scroll_to_bottom = scrollToBottom;
        scrollToBottom = null;
    }

    function enterDashboardMode(newState, prevState) {
        // Add a class to the document body so our styles can take effect
        $('body').toggleClass('view-only', newState === STATE_DASHBOARD_VIEW);

        // style menus accordingly
        $('#urth-notebook-view').removeClass('selected');
        $('#urth-dashboard-auth').toggleClass('selected', newState === STATE_DASHBOARD_AUTH);
        $('#urth-dashboard-view').toggleClass('selected', newState === STATE_DASHBOARD_VIEW);
        $('#urth-dashboard-show-all, #urth-dashboard-hide-all').toggleClass('disabled', newState === STATE_DASHBOARD_VIEW);

        // disable header and toolbar as necessary
        toggleHeaders(newState === STATE_DASHBOARD_AUTH);

        enterDbModeCallback(newState === STATE_DASHBOARD_AUTH /* doEnableGrid */);
        updateUrlState(newState === STATE_DASHBOARD_VIEW);

        // disable scroll to bottom of notebook
        scrollToBottom = IPython.Notebook.prototype.scroll_to_bottom;
        IPython.Notebook.prototype.scroll_to_bottom = function() {};
    }

    function setViewButtonEnabled(state) {
        var idx = VIEW_BTN_IDX[state];
        $('#urth-dashboard-view-toolbar-buttons > button:nth-of-type(' + idx + ')')
            .addClass('active')
            .siblings().removeClass('active');
    }

    var isHeaderVisible = true;
    var isToolbarVisible = true;

    function toggleHeaders(doShow) {
        // if hiding, save current state
        if (!doShow) {
            isHeaderVisible = $('#header-container').is(':visible');
            isToolbarVisible = $('div#maintoolbar').is(':visible');
        }
        // hide or revert back to previous saved state
        $('#header-container').toggle(doShow && isHeaderVisible);
        $('.header-bar').toggle(doShow && isHeaderVisible);
        $('div#maintoolbar').toggle(doShow && isToolbarVisible);
        // make sure notebook resizes properly
        IPython.notebook.events.trigger('resize-header.Page');
    }

    function updateUrlState(inDashboardViewMode) {
        var l = window.location;
        var s = l.search.slice(1);
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
        enterDbModeCallback = args.enterDashboardMode;
        exitDbModeCallback = args.exitDashboardMode;
        showAllCallback = args.showAll;
        hideAllCallback = args.hideAll;

        queryState();
    };

    DashboardActions.prototype.addMenuItems = function() {
        // View menu items
        $('#view_menu').append('<li class="divider"/>', viewMenuTemplate);
        $('#urth-notebook-view').click(toggleDashboardMode.bind(null, STATE_NOTEBOOK));
        $('#urth-dashboard-auth').click(toggleDashboardMode.bind(null, STATE_DASHBOARD_AUTH));
        $('#urth-dashboard-view').click(toggleDashboardMode.bind(null, STATE_DASHBOARD_VIEW));

        // initial selected menu item
        if (dashboardState === STATE_NOTEBOOK) {
            $('#urth-notebook-view').addClass('selected');
        } else if (dashboardState === STATE_DASHBOARD_VIEW) {
            $('#urth-dashboard-view').addClass('selected');
        }

        // Cell menu items
        $('#cell_menu').append('<li class="divider"/>', subMenuTemplate);
        $('#urth-dashboard-show-all').click(showAllCallback);
        $('#urth-dashboard-hide-all').click(hideAllCallback);
    };

    DashboardActions.prototype.addToolbarItems = function() {
        // switch view group
        var notebookView = {
            help: 'Notebook view. Edit the code.',
            icon: 'fa-code',
            help_index: '',
            handler: function() { toggleDashboardMode(STATE_NOTEBOOK); }
        };
        var layoutView = {
            help: 'Dashboard Layout. Size and position dashboard cells.',
            icon: 'fa-th-large',
            help_index: '',
            handler: function() { toggleDashboardMode(STATE_DASHBOARD_AUTH); }
        };
        var dashboardView = {
            help: 'Dashboard Preview. Preview the dashboard.',
            icon: 'fa-dashboard',
            help_index: '',
            handler: function() { toggleDashboardMode(STATE_DASHBOARD_VIEW); }
        };
        IPython.keyboard_manager.actions.register(notebookView, 'notebook-view', 'urth');
        IPython.keyboard_manager.actions.register(layoutView, 'layout-view', 'urth');
        IPython.keyboard_manager.actions.register(dashboardView, 'dashboard-view', 'urth');

        IPython.toolbar.add_buttons_group(['urth.notebook-view', 'urth.layout-view', 'urth.dashboard-view'],
                'urth-dashboard-view-toolbar-buttons');
        $('#urth-dashboard-view-toolbar-buttons')
            .addClass('urth-dashboard-toolbar-buttons')
            .prepend('<span class="navbar-text">View:</span>');

        // activate the button corresponding to the current view
        setViewButtonEnabled(dashboardState);
    };

    DashboardActions.prototype.switchToNotebook = function() {
        toggleDashboardMode(STATE_NOTEBOOK);
    };

    return DashboardActions;
});
