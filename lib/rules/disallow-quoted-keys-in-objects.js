/**
 * Disallows quoted keys in object if possible.
 *
 * Types: `Boolean`, `String` or `Object`
 *
 * Values:
 *
 *  - `true` for strict mode
 * - `Object`:
 *    - `"allExcept"` array of exceptions:
 *      - `"reserved"` allows ES3+ reserved words to remain quoted
 *         which is helpful when using this option with JSHint's `es3` flag.
 *
 * #### Example
 *
 * ```js
 * "disallowQuotedKeysInObjects": true
 * ```
 *
 * ##### Valid for mode `true`
 *
 * ```js
 * var x = { a: { default: 1 } };
 * ```
 *
 * ##### Valid for mode `{"allExcept": ["reserved"]}`
 *
 * ```js
 * var x = {a: 1, 'default': 2};
 * ```
 *
 * ##### Invalid
 *
 * ```js
 * var x = {'a': 1};
 * ```
 */

var assert = require('assert');

var reservedWords = require('reserved-words');
var cst = require('cst');

module.exports = function() {};

module.exports.prototype = {

    configure: function(options) {
        assert(
            options === true || typeof options === 'object',
            this.getOptionName() + ' option requires a true value or an object'
        );

        if (Array.isArray(options.allExcept)) {
            this._exceptReserved = options.allExcept.indexOf('reserved') !== -1;
        }
    },

    getOptionName: function() {
        return 'disallowQuotedKeysInObjects';
    },

    check: function(file, errors) {
        var KEY_NAME_RE = /^(0|[1-9][0-9]*|[a-zA-Z_$]+[\w$]*)$/; // number or identifier
        var exceptReserved = this._exceptReserved;

        file.iterateNodesByType('ObjectExpression', function(node) {
            node.properties.forEach(function(prop) {
                var key = prop.key;
                if (key.type === 'StringLiteral' &&
                    typeof key.value === 'string' &&
                    KEY_NAME_RE.test(key.value)
                ) {
                    if (exceptReserved && reservedWords.check(key.value, file.getDialect(), true)) {
                        return;
                    }

                    errors.cast({
                        message: 'Extra quotes for key',
                        element: prop,
                        additional: prop
                    });
                }
            });
        });
    },

    _fix: function(file, error) {
        var node = error.additional;
        var key = node.key.childElements[0];

        var newKey = new cst.Token(key.type, key.sourceCode.slice(1, -1));

        node.key.replaceChild(newKey, key);
    }

};
