/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
define([
    'jquery',
    'base/js/namespace'
], function(
    $,
    IPython
) {
    'use strict';

    return {
        /**
         * @param  {(DOM Element|jQuery)} el - child element of a cell
         * @return {jQuery} cell containing el
         */
        getParentCell: function(el) {
            return $(el).parents('.cell').first();
        },
        /**
         * Selects the specified cell and puts it into edit mode
         * @param  {(DOM Element|jQuery)} cell - cell to edit
         */
        editCell: function(cell) {
            var $cell = $(cell);
            var nbCell = $cell.data('cell');
            var nbIndex = IPython.notebook.find_cell_index(nbCell);
            IPython.notebook.select(nbIndex).edit_mode(nbCell);

            $cell.get(0).scrollIntoView({ behavior: 'smooth' });
            $cell.one('animationend', function() {
                // highlight animation cleanup
                $cell.removeClass('edit-select');
            });
            // commence highlight animation
            $cell.addClass('edit-select');
        }
    };
});
