/**
 * Disallows unused variables defined with var, let or const.
 *
 * Types: `Boolean`
 *
 * Values: `true`
 *
 * #### Example
 *
 * ```js
 * "disallowUnusedVariables": true
 * ```
 *
 * ##### Valid
 *
 * ```js
 * var x=1;
 *
 * function getX() {
 *     return x;
 * }
 *
 * ```
 *
 * ##### Invalid
 *
 * ```js
 * var x =1;
 *
 * function getX() {
 *     var x=1;
 *     return x;
 * }
 *
 * ```
 */

var assert = require('assert');

module.exports = function() {};

module.exports.prototype = {
    configure: function(options) {
        assert(
            options === true,
            this.getOptionName() + ' option requires a true value or should be removed'
        );
    },

    getOptionName: function() {
        return 'disallowUnusedVariables';
    },

    check: function(file, errors) {
        var program = file.getProgram();
        var nodesToCheck = [];

        function reportError(node) {
            errors.add('Variable `' + node.name + '` is not used', node);
        }

        function isVariableGood(variable) {
            var isVariable = variable.definitions.some(function checkVariableDefinition(definition) {
                var parentElement = definition.node.parentElement;
                var greatGrandparentElement = parentElement.parentElement.parentElement;

                return (parentElement.type === 'VariableDeclarator') && (greatGrandparentElement.type !== 'ExportNamedDeclaration')
            });

            return isVariable;
        }

        // Get global scope variables.
        nodesToCheck = file.getScopes().acquire(program).variables
            .reduce(function getVariablesInGlobalScope(acc, variable) {
                if (isVariableGood(variable)) {
                    acc.push(variable);
                }

                return acc;
            }, []);


        // Loop over all functions and get variables declared within its scope.
        file.iterateNodesByType(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ClassDeclaration'], function(node) {
            var scope = file.getScopes().acquire(node);
            var variableList = [];

            if (scope.childScopes.length > 0) {
                scope.childScopes.reduce(function iterateClassChildScopes(acc, childScope) {
                    childScope.variables.forEach(function iterateChildScopeVariables(variable) {
                        acc.push(variable);
                    });

                    return acc;
                }, variableList);

            } else {
                scope.variables.reduce(function getVariablesInFunctionScope(acc, variable) {
                    // if (isVariableGood(variable)) {
                    //     acc.push(variable);
                    // }
                    //
                    acc.push(variable);

                    return acc;
                }, variableList);             
            }

            variableList.reduce(function getVariablesToCheck(acc, variable) {
                if (isVariableGood(variable)) {
                    acc.push(variable);
                }

                return acc;
            }, nodesToCheck);
        });

        var unusedNodes = nodesToCheck.reduce(function checkVariableReferences(acc, variable) {
            if (variable.references.length === 1) {
                variable.definitions.forEach(function pushVariableDefinition(definition) {
                    acc.push(definition.node);
                });
            }

            return acc;
        }, []);

        unusedNodes.forEach(reportError);
    },

    _fix: function(file, error) {
        var node = error.element;

        while(node.type !== 'VariableDeclaration') {
            node = node.parentElement;
        }

        node.parentElement.removeChild(node);
        error.fixed = true;
    }
};

