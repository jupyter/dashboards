/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Overrides some Gridstack functions
 */
define(['jquery', 'Gridstack'], function($, Gridstack) {

    var GridstackCustom = function() {
        Gridstack.apply(this, arguments);
    };

    GridstackCustom.prototype = Object.create(Gridstack.prototype);
    GridstackCustom.prototype.constructor = GridstackCustom;

    GridstackCustom.prototype.__destroy = Gridstack.prototype.destroy;
    GridstackCustom.prototype.destroy = function(detach_node) {
        detach_node = typeof detach_node === 'undefined' ? true : detach_node;

        if (!detach_node) {
            // Gridstack.destroy() removes the container from the DOM. Hack around it to make it
            // a no-op if `detach_node` is false.
            var $container = this.container;
            var oldRemove = $.fn.remove;
            $.fn.remove = function() {
                if (!this.is($container)) {
                    return oldRemove.apply(this, arguments);
                }
                return this;
            };
        }

        this.__destroy();

        if (!detach_node) {
            $.fn.remove = oldRemove;
        }
    };

    /**
     * Generates cell styles which depend on margin (which is a layout option).
     * @param {Object[]} rules - list of style rules
     * @param {string} rules[].selector - CSS style selector
     * @param {string} rules[].rules - CSS style rules for given selector
     */
    GridstackCustom.prototype.generateStylesheet = function(rules) {
        var Utils = Gridstack.Utils;

        // init new style
        this._styles_id_2 = 'gridstack-style-' + (Math.random() * 100000).toFixed();
        this._styles_2 = Utils.create_stylesheet(this._styles_id_2);
        var style = this._styles_2;

        rules.forEach(function(item, i) {
            Utils.insert_css_rule(style,
                item.selector,
                item.rules,
                i
            );
        });
    };

    GridstackCustom.prototype.removeStylesheet = function() {
        if (this._styles_id_2) {
            Gridstack.Utils.remove_stylesheet(this._styles_id_2);
        }
    };

    window.GridStackUI = GridstackCustom;
    window.GridStackUI.Utils = Gridstack.Utils;

    // Override jQuery function to use our custom class
    $.fn.gridstack = function(opts) {
        return this.each(function() {
            if (!$(this).data('gridstack')) {
                $(this).data('gridstack', new GridstackCustom(this, opts));
            }
        });
    };

    return GridstackCustom;

});
