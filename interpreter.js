/**
 * Acorn JavaScript Interpreter
 *
 * Copyright 2013 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Interpreting JavaScript in JavaScript.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

/**
 * Create a new interpreter.
 * @param {string} code Raw JavaScript text.
 * @constructor
 */
var Interpreter = function(code) {
  this.ast = acorn.parse(code);
  var scope = this.createScope(this.ast, null);
  this.stateStack = [{node: this.ast, scope: scope}];
};

/**
 * Execute one step of the interpreter.
 * @return {boolean} True if a step was executed, false if no more instructions.
 */
Interpreter.prototype.step = function() {
  if (this.stateStack.length == 0) {
    return false;
  }
  var state = this.stateStack[0];
  this['step' + state.node.type]();
  console.log(state.node);
  return true;
};

/**
 * Execute the interpreter to program completion.
 */
Interpreter.prototype.run = function() {
  while(this.step()) {}
};

/**
 * Returns the current scope from the stateStack.
 * @return {!Object} Current scope dictionary.
 */
Interpreter.prototype.getScope = function() {
  for (var i = 0; i < this.stateStack.length; i++) {
    if (this.stateStack[i].scope) {
      return this.stateStack[i].scope;
    }
  }
  throw 'No scope found.';
};

/**
 * Create a new scope dictionary.
 * @param {Object} node AST node defining the scope container (e.g. a function).
 * @param {Object} parentScope Scope to link to.
 * @return {!Object} New scope.
 */
Interpreter.prototype.createScope = function(node, parentScope) {
  var scope = Object.create(null);
  scope[' '] = parentScope;  // Space is an illegal identifier.

  if (node.type == 'FunctionDeclaration' ||
      node.type == 'FunctionExpression') {
    for (var i = 0; i < node.params.length; i++) {
      state.scope[node.params[i].name] = undefined;
    }
  }
  this.populateScope_(node, scope);
  return scope;
};

/**
 * Retrieves a value from the scope chain.
 * @param {*} Value.
 * @throws {string} Error if identifier does not exist.
 */
Interpreter.prototype.getValueFromScope = function(id) {
  var scope = this.getScope();
  while (scope) {
    if (id in scope) {
      return scope[id];
    }
    scope = scope[' '];
  }
  throw 'Unknown identifier: ' + id;
};

/**
 * Create a new function.
 * @param {Object} node AST node defining the function.
 * @return {!Object} New function.
 */
Interpreter.prototype.createFunction = function(node) {
  var func = {};
  func.parentScope = this.getScope();
  func.node = node;
  func.type = 'function';
  return func;
};

/**
 * Create a new scope for the given node.
 * @param {!Object} node AST node (program or function).
 * @param {!Object} scope Scope dictionary to populate.
 * @private
 */
Interpreter.prototype.populateScope_ = function(node, scope) {
  if (node.type == 'VariableDeclaration') {
    for (var i = 0; i < node.declarations.length; i++) {
      scope[node.declarations[i].id.name] = undefined;
    }
  }
  var thisIterpreter = this;
  function recurse(child) {
    if (child.constructor == thisIterpreter.ast.constructor) {
      if (child.type != 'FunctionDeclaration' &&
          child.type != 'FunctionExpression') {
        thisIterpreter.populateScope_(child, scope);
      }
    }
  }
  for (var name in node) {
    var prop = node[name];
    if (prop && typeof prop == 'object') {
      if (prop.constructor == Array) {
        for (var i = 0; i < prop.length; i++) {
          recurse(prop[i]);
        }
      } else {
        recurse(prop);
      }
    }
  }
};

Interpreter.prototype['stepProgram'] =
Interpreter.prototype['stepBlockStatement'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  var n = state.n || 0;
  if (node.body[n]) {
    state.n = n + 1;
    this.stateStack.unshift({node: node.body[n]});
  } else {
    this.stateStack.shift();
  }
};

Interpreter.prototype['stepExpressionStatement'] = function() {
  var state = this.stateStack[0];
  if (!state.done) {
    state.done = true;
    this.stateStack.unshift({node: state.node.expression});
  } else {
    this.stateStack.shift();
  }
};

Interpreter.prototype['stepIfStatement'] =
Interpreter.prototype['stepConditionalExpression'] = function() {
  var state = this.stateStack[0];
  if (!state.done) {
    if (!state.condition) {
      state.condition = true;
      this.stateStack.unshift({node: state.node.test});
    } else {
      state.done = true;
      if (state.value && state.node.consequent) {
        this.stateStack.unshift({node: state.node.consequent});
      } else if (!state.value && state.node.alternate) {
        this.stateStack.unshift({node: state.node.alternate});
      }
    }
  } else {
    this.stateStack.shift();
    if (state.node.type == 'stepConditionalExpression') {
      this.stateStack[0].value = state.value;
    }
  }
};

Interpreter.prototype['stepWhileStatement'] =
Interpreter.prototype['stepDoWhileStatement'] = function() {
  var state = this.stateStack[0];
  if (state.node.type == 'DoWhileStatement' && state.condition === undefined) {
    // First iteration of do/while executes without checking condition.
    state.value = true;
    state.condition = true;
  }
  if (!state.condition) {
    state.condition = true;
    this.stateStack.unshift({node: state.node.test});
  } else {
    state.condition = false;
    if (!state.value) {
      this.stateStack.shift();
    } else if (state.node.body) {
      this.stateStack.unshift({node: state.node.body});
    }
  }
};

Interpreter.prototype['stepSequenceExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  var n = state.n || 0;
  if (node.expressions[n]) {
    state.n = n + 1;
    this.stateStack.unshift({node: node.expressions[n]});
  } else {
    this.stateStack.shift();
    this.stateStack[0].value = state.value;
  }
};

Interpreter.prototype['stepLogicalExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (node.operator != '&&' && node.operator != '||') {
    throw 'Unknown logical operator: ' + node.operator;
  }
  if (!state.doneLeft) {
    state.doneLeft = true;
    this.stateStack.unshift({node: node.left});
  } else if (!state.doneRight) {
    if ((node.operator == '&&' && !state.value) ||
        (node.operator == '||' && state.value)) {
      // Shortcut evaluation.
      this.stateStack.shift();
      this.stateStack[0].value = state.value;
    } else {
      state.doneRight = true;
      this.stateStack.unshift({node: node.right});
    }
  } else {
    this.stateStack.shift();
    this.stateStack[0].value = state.value;
  }
};

Interpreter.prototype['stepBinaryExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.doneLeft) {
    state.doneLeft = true;
    this.stateStack.unshift({node: node.left});
  } else if (!state.doneRight) {
    state.doneRight = true;
    state.leftValue = state.value;
    this.stateStack.unshift({node: node.right});
  } else {
    this.stateStack.shift();
    var leftValue = state.leftValue;
    var rightValue = state.value;
    var value;
    if (node.operator == '==') {
      value = leftValue == rightValue;
    } else if (node.operator == '!=') {
      value = leftValue != rightValue;
    } else if (node.operator == '===') {
      value = leftValue === rightValue;
    } else if (node.operator == '!==') {
      value = leftValue !== rightValue;
    } else if (node.operator == '>') {
      value = leftValue > rightValue;
    } else if (node.operator == '>=') {
      value = leftValue >= rightValue;
    } else if (node.operator == '<') {
      value = leftValue < rightValue;
    } else if (node.operator == '<=') {
      value = leftValue <= rightValue;
    } else if (node.operator == '+') {
      value = leftValue + rightValue;
    } else if (node.operator == '-') {
      value = leftValue - rightValue;
    } else if (node.operator == '*') {
      value = leftValue * rightValue;
    } else if (node.operator == '/') {
      value = leftValue / rightValue;
    } else if (node.operator == '%') {
      value = leftValue % rightValue;
    } else if (node.operator == '&') {
      value = leftValue & rightValue;
    } else if (node.operator == '|') {
      value = leftValue | rightValue;
    } else if (node.operator == '^') {
      value = leftValue ^ rightValue;
    } else if (node.operator == '<<') {
      value = leftValue << rightValue;
    } else if (node.operator == '>>') {
      value = leftValue >> rightValue;
    } else if (node.operator == '>>>') {
      value = leftValue >>> rightValue;
    } else {
      throw 'Unknown binary operator: ' + node.operator;
    }
    this.stateStack[0].value = value;
  }
};

Interpreter.prototype['stepUnaryExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.done) {
    state.done = true;
    this.stateStack.unshift({node: node.argument});
  } else {
    this.stateStack.shift();
    var value;
    if (node.operator == '-') {
      value = -state.value;
    } else if (node.operator == '!') {
      value = !state.value;
    } else if (node.operator == '~') {
      value = ~state.value;
    } else if (node.operator == 'typeof') {
      value = typeof state.value;
    } else if (node.operator == 'void') {
      value = undefined;
    } else {
      throw 'Unknown unary operator: ' + node.operator;
    }
    this.stateStack[0].value = value;
  }
};

Interpreter.prototype['stepLiteral'] = function() {
  var state = this.stateStack[0];
  this.stateStack.shift();
  this.stateStack[0].value = state.node.value;
};

Interpreter.prototype['stepFunctionDeclaration'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  var name = node.id.name;
  var scope = this.getScope();
  scope[name] = this.createFunction(node);
  this.stateStack.shift();
};

Interpreter.prototype['stepFunctionExpression'] = function() {
  var state = this.stateStack[0];
  this.stateStack.shift();
  this.stateStack[0].value = this.createFunction(state.node);
};

Interpreter.prototype['stepVariableDeclaration'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  var n = state.n || 0;
  if (node.declarations[n]) {
    state.n = n + 1;
    this.stateStack.unshift({node: node.declarations[n]});
  } else {
    this.stateStack.shift();
  }
};

Interpreter.prototype['stepVariableDeclarator'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (node.init && !state.done) {
    state.done = true;
    this.stateStack.unshift({node: node.init});
  } else {
    var value = state.value;  // Possibly undefined.
    var name = node.id.name;
    var scope = this.getScope();
    scope[name] = value;
    this.stateStack.shift();
  }
};

Interpreter.prototype['stepIdentifier'] = function() {
  var state = this.stateStack[0];
  this.stateStack.shift();
  this.stateStack[0].value = this.getValueFromScope(state.node.name);
};

Interpreter.prototype['stepCallExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.doneCallee) {
    state.doneCallee = true;
    this.stateStack.unshift({node: node.callee});
  } else {
    if (!state.func) {
      state.func = state.value;
      if (state.func.type != 'function') {
        throw 'Not a function';
      }
      state.arguments = [];
      var n = 0;
    } else {
      var n = state.n;
      if (state.arguments.length != node.arguments.length) {
        state.arguments[n - 1] = state.value;
      }
    }
    if (node.arguments[n]) {
      state.n = n + 1;
      this.stateStack.unshift({node: node.arguments[n]});
    } else if (!state.doneExec) {
      state.doneExec = true;
      var scope =
          this.createScope(state.func.node.body, state.func.parentScope);
      for (var i = 0; i < state.func.node.params.length; i++) {
        scope[state.func.node.params[i].name] = state.arguments[i];
      }
      // TODO: Add 'arguments' array here.
      var funcState = {node: state.func.node.body, scope: scope};
      this.stateStack.unshift(funcState);
    } else {
      this.stateStack.shift();
      this.stateStack[0].value = state.value;
    }
  }
};

Interpreter.prototype['stepReturnStatement'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (node.argument && !state.done) {
    state.done = true;
    this.stateStack.unshift({node: node.argument});
  } else {
    var value = state.value;  // Possibly undefined.
    do {
      this.stateStack.shift();
      if (this.stateStack.length == 0) {
        throw 'Illegal return statement';
      }
      state = this.stateStack[0];
    } while (state.node.type != 'CallExpression');
    state.value = value;
  }
};
