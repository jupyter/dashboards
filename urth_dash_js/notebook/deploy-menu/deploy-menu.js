/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
/* global define, JSON */
define([
    'jquery',
    'base/js/namespace'
], function($, IPython) {
    'use strict';

    $(function() {
        var $li = $('<li>')
            .addClass('dropdown-submenu')
            .insertAfter('#file_menu .dropdown-submenu:eq(2)');
        $('<a>')
            .text('Deploy as')
            .attr('href', '#')
            .appendTo($li);
        var $ul = $('<ul>')
            .addClass('dropdown-menu')
            .appendTo($li);
        $li = $('<li>')
            .appendTo($ul);
        var $a = $('<a>');
        $a.attr('href', '#')
            .text('Dashboard on Bluemix')
            .appendTo($li);
        if (window.location.search.indexOf('enable_bluemix_deploy') > 0) {
            // still possible to trigger if added and just disabled
            $a.on('click', function() {
                // Notebook name might change so read it here
                // Do base_url here too because I don't know when that changes
                var base_url = IPython.notebook.base_url;
                var path = IPython.notebook.notebook_path;
                // Have to open immediately to avoid popup blockers
                window.open(
                    location.protocol + '//' +
                    location.host +
                    base_url +
                    'bundle?type=bluemix&notebook='+
                    encodeURIComponent(path)
                );
            });
        }
        else {
            $li.addClass('disabled');
        }
        $li = $('<li>')
            .appendTo($ul);
        $('<a>')
            .attr('href', '#')
            .text('Local Dashboard')
            .appendTo($li)
            .on('click', function() {
                // Notebook name might change so read it here
                // Do base_url here too because I don't know when that changes
                var base_url = IPython.notebook.base_url;
                var path = IPython.notebook.notebook_path;

                // Have to open immediately to avoid popup blockers
                window.open(
                    location.protocol + '//' +
                    location.host +
                    base_url +
                    'bundle?type=dashboard&notebook='+
                    encodeURIComponent(path)
                );
            });

        $li = $('<li>')
            .insertAfter($('#download_pdf'));
        $('<a>')
            .text('Dashboard Bundle (zip)')
            .appendTo($li)
            .on('click', function() {
                // Notebook name might change so read it here
                // Do base_url here too because I don't know when that changes
                var base_url = IPython.notebook.base_url;
                var path = IPython.notebook.notebook_path;

                // Have to open immediately to avoid popup blockers
                window.open(
                    location.protocol + '//' +
                    location.host +
                    base_url +
                    'bundle?type=zip&notebook='+
                    encodeURIComponent(path)
                );
            });
    });
});