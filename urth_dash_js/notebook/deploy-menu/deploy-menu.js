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

    var do_bundle = function(type) {
        // Notebook name might change so read it here
        // Do base_url here too because I don't know when that changes
        var base_url = IPython.notebook.base_url;
        var path = IPython.notebook.notebook_path;
        var url = (
            location.protocol + '//' +
            location.host +
            base_url +
            'bundle?type=' + type + 
            '&notebook=' + encodeURIComponent(path)
        );

        // Have to open new window immediately to avoid popup blockers
        var w = window.open('', IPython._target);
        if (IPython.notebook.dirty) {
            // Delay requesting the bundle until a dirty notebook is saved
            var d = IPython.notebook.save_notebook();
            // https://github.com/jupyter/notebook/issues/618
            if(d) {
                d.then(function() {
                    w.location = url;
                });
            }
        } else {
            w.location = url;
        }
    };

    // Add the menu items after DOM ready
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
                do_bundle('bluemix');
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
                do_bundle('dashboard');
            });

        $li = $('<li>')
            .insertAfter($('#download_pdf'));
        $('<a>')
            .attr('href', '#')
            .text('Dashboard Bundle (.zip)')
            .appendTo($li)
            .on('click', function() {
                do_bundle('zip');
            });
        $li = $('<li>')
        .insertAfter($('#download_ipynb'));
        $('<a>')
            .attr('href', '#')
            .text('IPython Bundled Notebook (.zip)')
            .appendTo($li)
            .on('click', function() {
                do_bundle('ipynb');
            });
    });
});