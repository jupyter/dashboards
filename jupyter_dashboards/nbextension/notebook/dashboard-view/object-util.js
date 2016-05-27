/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
define([], function() {
    'use strict';

    return {
        /**
         * @param  {Object} obj - Object to test
         * @param  {string} prop - Name of property to test.
         *                         May be a '.'-delimited string to check nested objects
         * @return {boolean} true if specified object has specified property
         */
        has: function(obj, prop) {
            var currentLevel = obj;
            return prop.split('.').every(function(prop) {
                var has = currentLevel.hasOwnProperty(prop);
                currentLevel = currentLevel[prop];
                return has;
            });
        },
        /**
         * Ensures a property is present in an object.
         * Sets the property to an empty object if not set.
         * @param  {Object} obj - Object to test
         * @param  {string} prop - Name of property to test.
         *                         May be a '.'-delimited string to ensure nested objects
         */
        ensure: function(obj, prop) {
            var currentLevel = obj;
            prop.split('.').forEach(function(p) {
                if (!currentLevel.hasOwnProperty(p)) {
                    currentLevel[p] = {};
                }
                currentLevel = currentLevel[p];
            });
        }
    };
});
