/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * This module adds support for Polymer elements when used within the Dashboard view.
 *
 * Polymer Element Resizing
 * ------------------------
 * To make a Polymer element get notified if its parent/ancestor cell is resized, add the
 * [iron-resizable-behavior](https://elements.polymer-project.org/elements/iron-resizable-behavior)
 * to that element. The Dashboard will notify the element when a cell has resized -- simply listen
 * for the `iron-resize` event.
 */
define([
    'jquery',
    'base/js/namespace',
], function(
    $,
    IPython
) {
    'use strict';

    var resizableElements = $();

    // Listen for Polymer elements that include the `iron-resizable-behavior`. Store for later use.
    function registerPolymerResizeRequest(cell) {
        $(cell.element).on('iron-request-resize-notifications', function(event) {
            console.log('Polymer element requesting resize notifications');

            var target = event.path ? event.path[0] : event.target;
            resizableElements = resizableElements.add(target);
            fireIronResizeEvent(target);
            event.stopPropagation();
        });
    }

    function fireIronResizeEvent(node) {
        var evt = new Event('iron-resize', { bubbles: false });
        node.dispatchEvent(evt);
    }

    function onResize(cellNode) {
        resizableElements.filter(function() {
            return $(this).parents().is(cellNode);
        })
        .each(function() {
            fireIronResizeEvent(this);
        });
    }

    function notifyResizeAll() {
        resizableElements.each(function() {
            fireIronResizeEvent(this);
        });
    }

    function init() {
        // add our listener to newly create cells
        IPython.notebook.events.on('create.Cell', function(evt, args) {
            registerPolymerResizeRequest(args.cell);
        });

        // remove references to Polymer elements from deleted cells
        IPython.notebook.events.on('delete.Cell', function(evt, args) {
            // filter out elements which are within given cell
            resizableElements = resizableElements.filter(function() {
                return !$(this).parents().is(args.cell.element);
            });
        });

        // The Notebook triggers the 'create.Cell' event when loading a notebook, but before our
        // extension is loaded. Therefore, add our listener to all existing cells.
        IPython.notebook.get_cells().forEach(registerPolymerResizeRequest);
    }

    return {
        /**
         * Registers resize listeners on cells.
         */
        init: init,

        /**
         * Invoke when a Dashboard cell is resized.
         * @param {DOMNode} cellNode - the dashboard cell which was resized
         */
        onResize: onResize,

        /**
         * Notify all managed Polymer elements that their parent cell may have been resized.
         */
        notifyResizeAll: notifyResizeAll
    };
});
