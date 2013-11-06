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
  this.initGlobalScope(scope);
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
  while(this.step()) {};
};

/**
 * Initialize the global scope with buitin properties and functions.
 * @param {!Object} scope Global scope.
 */
Interpreter.prototype.initGlobalScope = function(scope) {
  // Initialize uneditable global properties.
  this.setProperty(scope, this.createPrimitive('Infinity'),
                   this.createPrimitive(Infinity), true);
  this.setProperty(scope, this.createPrimitive('NaN'),
                   this.createPrimitive(NaN), true);
  this.setProperty(scope, this.createPrimitive('undefined'),
                   this.createPrimitive(undefined), true);
  this.setProperty(scope, this.createPrimitive('window'),
                   scope, true);
  this.setProperty(scope, this.createPrimitive('self'),
                   scope, false); // Editable.

  // Initialize global functions.
  var wrapper
  wrapper = function(text) {
    return alert(text.toString());
  };
  this.setProperty(scope, this.createPrimitive('alert'),
                   this.createNativeFunction(wrapper));
  wrapper = function(num) {
    return isNaN(num.toNumber());
  };
  this.setProperty(scope, this.createPrimitive('isNaN'),
                   this.createNativeFunction(wrapper));
  wrapper = function(num) {
    return isFinite(num.toNumber());
  };
  this.setProperty(scope, this.createPrimitive('isFinite'),
                   this.createNativeFunction(wrapper));
  wrapper = function(str) {
    return parseFloat(str.toNumber());
  };
  this.setProperty(scope, this.createPrimitive('parseFloat'),
                   this.createNativeFunction(wrapper));
  wrapper = function(str, radix) {
    return parseInt(str.toString(), radix.toNumber());
  };
  this.setProperty(scope, this.createPrimitive('parseInt'),
                   this.createNativeFunction(wrapper));
  var strFunctions = ['escape', 'unescape',
                      'decodeURI', 'decodeURIComponent',
                      'encodeURI', 'encodeURIComponent'];
  for (var i = 0; i < strFunctions.length; i++) {
    wrapper = (function(nativeFunc) {
      return function(str) {
        return nativeFunc(str.toString());
      };
    })(window[strFunctions[i]]);
    this.setProperty(scope, this.createPrimitive(strFunctions[i]),
                     this.createNativeFunction(wrapper));
  }

  // Initialize Math object.
  var myMath = this.createValue(Object);
  this.setProperty(scope, this.createPrimitive('Math'), myMath);
  var mathConsts = ['E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'PI',
                    'SQRT1_2', 'SQRT2'];
  for (var i = 0; i < mathConsts.length; i++) {
    this.setProperty(myMath, this.createPrimitive(mathConsts[i]),
                     this.createPrimitive(Math[mathConsts[i]]));
  }
  var numFunctions = ['abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos',
                      'exp', 'floor', 'log', 'max', 'min', 'pow', 'random',
                      'round', 'sin', 'sqrt', 'tan'];
  for (var i = 0; i < numFunctions.length; i++) {
    wrapper = (function(nativeFunc) {
      return function() {
        for (var j = 0; j < arguments.length; j++) {
          arguments[j] = arguments[j].toNumber();
        }
        return nativeFunc.apply(Math, arguments);
      };
    })(Math[numFunctions[i]]);
    this.setProperty(myMath, this.createPrimitive(numFunctions[i]),
                     this.createNativeFunction(wrapper));
  }
};

/**
 * Is an object of a certain class?
 * @param {!Object} child Object to check.
 * @param {!Object} parent Class of object.
 * @return {boolean} True if object is the class or inherits from it.
 *     False otherwise.
 */
Interpreter.prototype.isa = function(child, parent) {
  return child === parent || child instanceof parent;
};

/**
 * Is a value a legal integer for an array?
 * @param {*} n Value to check.
 * @return {NaN|number} Zero, or a positive integer if the value can be
 * converted to such.  NaN otherwise.
 */
Interpreter.prototype.arrayIndex = function(n) {
  n = Number(n);
  if (!isFinite(n) || n != Math.floor(n) || n < 0) {
    return NaN;
  }
  return n;
};

/**
 * Create a new data object for a primitive.
 * @param {undefined|null|boolean|number|string} data Data to encapsulate.
 * @return {!Object} New data object.
 */
Interpreter.prototype.createPrimitive = function(data) {
  var obj = {
    data: data,
    isPrimitive: true,
    type: typeof data,
    toBoolean: function() {return Boolean(this.data);},
    toNumber: function() {return Number(this.data);},
    toString: function() {return String(this.data);}
  };
  return obj;
};

/**
 * Create a new data object.
 * @param {*} data Data to encapsulate.
 * @return {!Object} New data object.
 */
Interpreter.prototype.createValue = function(constructor) {
  var obj = {
    isPrimitive: false,
    type: (this.isa(constructor, Function) ? 'function' : 'object'),
    constructor: constructor,
    fixed: Object.create(null),
    properties: Object.create(null),
    toBoolean: function() {return true;},
    toNumber: function() {return 0;},
    toString: function() {return String(constructor);}
  };
  if (this.isa(constructor, Array)) {
    obj.length = 0;
  }
  return obj;
};

/**
 * Create a new function.
 * @param {Object} node AST node defining the function.
 * @param {Object} opt_scope Optional parent scope.
 * @return {!Object} New function.
 */
Interpreter.prototype.createFunction = function(node, opt_scope) {
  var func = this.createValue(Function);
  func.parentScope = opt_scope || this.getScope();
  func.node = node;
  return func;
};

/**
 * Create a new native function.
 * @param {!Function} nativeFunc JavaScript function.
 * @return {!Object} New function.
 */
Interpreter.prototype.createNativeFunction = function(nativeFunc) {
  var func = this.createValue(Function);
  func.nativeFunc = nativeFunc;
  return func;
};

/**
 * Fetch a property value from a data object.
 * @param {!Object} obj Data object.
 * @param {!Object} name Name of property.
 * @return {Object} Property value (may be undefined).
 */
Interpreter.prototype.getProperty = function(obj, name) {
  if (obj.isPrimitive && name.toString() == 'length' &&
      obj.type == 'string') {
    return this.createPrimitive(obj.data.length);
  } else if (!obj.isPrimitive && name.toString() == 'length' &&
      this.isa(obj.constructor, Array)) {
    return this.createPrimitive(obj.length);
  }
  if (!obj.isPrimitive) {
    if (name.toString() in obj.properties) {
      return obj.properties[name.toString()]
    }
  }
  // TODO: Recurse to parent objects.
  return this.createPrimitive(undefined);
};

/**
 * Does the named property exist on a data object.
 * @param {!Object} obj Data object.
 * @param {!Object} name Name of property.
 * @return {boolean} True if property exists.
 */
Interpreter.prototype.hasProperty = function(obj, name) {
  if (name.toString() == 'length' && (obj.isPrimitive ?
      obj.type == 'string' : this.isa(obj.constructor, Array))) {
    return true;
  } else if (obj.isPrimitive) {
    return false;
  }
  return name.toString() in obj.properties;
};

/**
 * Set a property value on a data object.
 * @param {!Object} obj Data object.
 * @param {!Object} name Name of property.
 * @param {*} value New property value.
 * @param {boolean} opt_fixed Unchangable property if true.
 */
Interpreter.prototype.setProperty = function(obj, name, value, opt_fixed) {
  name = name.toString();
  if (obj.isPrimitive || obj.fixed[name]) {
    return;
  }
  if (this.isa(obj.constructor, Array)) {
    // Arrays have a magic length variable that is bound to the elements.
    var i;
    if (name == 'length') {
      // Delete elements if length is smaller.
      var newLength = this.arrayIndex(value.toNumber());
      if (isNaN(newLength)) {
        throw new RangeError('Invalid array length');
      }
      if (newLength < obj.length) {
        for (i in obj.properties) {
          i = this.arrayIndex(i);
          if (!isNaN(i) && newLength <= i) {
            delete obj.properties[i];
          }
        }
      }
      obj.length = newLength;
    } else if (!isNaN(i = this.arrayIndex(name))) {
      // Increase length if this index is larger.
      obj.length = Math.max(obj.length, i);
    }
  }
  // Set the property.
  obj.properties[name] = value;
  if (opt_fixed) {
    obj.fixed[name] = true;
  }
};

/**
 * Delete a property value on a data object.
 * @param {!Object} obj Data object.
 * @param {!Object} name Name of property.
 */
Interpreter.prototype.deleteProperty = function(obj, name) {
  name = name.toString();
  if (obj.isPrimitive || obj.fixed[name]) {
    return false;
  }
  if (name == 'length' && this.isa(obj.constructor, Array)) {
    return false;
  }
  return delete obj.properties[name];
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
  var scope = this.createValue(Object);
  scope.parentScope = parentScope;  // Space is an illegal identifier.

  if (node.type == 'FunctionDeclaration' ||
      node.type == 'FunctionExpression') {
    for (var i = 0; i < node.params.length; i++) {
      this.setProperty(state.scope, node.params[i].name, undefined);
    }
  }
  this.populateScope_(node, scope);
  return scope;
};

/**
 * Retrieves a value from the scope chain.
 * @param {!Object} name Name of variable.
 * @throws {string} Error if identifier does not exist.
 */
Interpreter.prototype.getValueFromScope = function(name) {
  var scope = this.getScope();
  name = name.toString();
  while (scope) {
    if (this.hasProperty(scope, name)) {
      return this.getProperty(scope, name);
    }
    scope = scope.parentScope;
  }
  throw 'Unknown identifier: ' + name;
};

/**
 * Sets a value to the currest scope.
 * @param {string} name Name of variable.
 * @param {*} value Value.
 */
Interpreter.prototype.setValueToScope = function(name, value) {
  var scope = this.getScope();
  this.setProperty(scope, name, value);
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
      this.setProperty(scope,
          this.createPrimitive(node.declarations[i].id.name), undefined);
    }
  } else if (node.type == 'FunctionDeclaration') {
    this.setProperty(scope,
        this.createPrimitive(node.id.name),
        this.createFunction(node, scope));
    return;  // Do not recurse into function.
  } else if (node.type == 'FunctionExpression') {
    return;  // Do not recurse into function.
  }
  var thisIterpreter = this;
  function recurse(child) {
    if (child.constructor == thisIterpreter.ast.constructor) {
      thisIterpreter.populateScope_(child, scope);
    }
  }
  for (var name in node) {
    var prop = node[name];
    if (prop && typeof prop == 'object') {
      if (prop instanceof Array) {
        for (var i = 0; i < prop.length; i++) {
          recurse(prop[i]);
        }
      } else {
        recurse(prop);
      }
    }
  }
};

/**
 * Gets a value from the scope chain or from an object property.
 * @param {!Object|!Array} name Name of variable or object/propname tuple.
 * @return {*} Value.
 */
Interpreter.prototype.getValue = function(left, value) {
  if (left instanceof Array) {
    var obj = left[0];
    var prop = left[1];
    return this.getProperty(obj, prop);
  } else {
    return this.getValueFromScope(left);
  }
};

/**
 * Sets a value to the scope chain or to an object property.
 * @param {!Object|!Array} name Name of variable or object/propname tuple.
 * @param {*} value Value.
 */
Interpreter.prototype.setValue = function(left, value) {
  if (left instanceof Array) {
    var obj = left[0];
    var prop = left[1];
    this.setProperty(obj, prop, value);
  } else {
    this.setValueToScope(left, value);
  }
};

// Functions to handle each node type.

Interpreter.prototype['stepArrayExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  var n = state.n || 0;
  if (!state.array) {
    state.array = this.createValue(Array);
  } else {
    this.setProperty(state.array, this.createPrimitive(n - 1), state.value);
  }
  if (node.elements[n]) {
    state.n = n + 1;
    this.stateStack.unshift({node: node.elements[n]});
  } else {
    state.array.length = state.n;
    this.stateStack.shift();
    this.stateStack[0].value = state.array;
  }
};

Interpreter.prototype['stepAssignmentExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.doneLeft) {
    state.doneLeft = true;
    this.stateStack.unshift({node: node.left, assign: true});
  } else if (!state.doneRight) {
    state.doneRight = true;
    state.leftSide = state.value;
    this.stateStack.unshift({node: node.right});
  } else {
    this.stateStack.shift();
    var leftSide = state.leftSide;
    var rightSide = state.value;
    var leftValue = this.getValue(leftSide);
    var rightValue = rightSide;
    var leftNumber = leftValue.toNumber();
    var rightNumber = rightValue.toNumber();
    var value;
    if (node.operator == '=') {
      value = rightSide;
    } else if (node.operator == '+=') {
      var left, right;
      if (leftValue.type == 'string' || rightValue.type == 'string') {
        left = leftValue.toString();
        right = rightValue.toString();
      } else {
        left = leftNumber;
        right = rightNumber;
      }
      value = left + right;
    } else if (node.operator == '-=') {
      value = leftNumber - rightNumber;
    } else if (node.operator == '*=') {
      value = leftNumber * rightNumber;
    } else if (node.operator == '/=') {
      value = leftNumber / rightNumber;
    } else if (node.operator == '%=') {
      value = leftNumber % rightNumber;
    } else if (node.operator == '<<=') {
      value = leftNumber << rightNumber;
    } else if (node.operator == '>>=') {
      value = leftNumber >> rightNumber;
    } else if (node.operator == '>>>=') {
      value = leftNumber >>> rightNumber;
    } else if (node.operator == '&=') {
      value = leftNumber & rightNumber;
    } else if (node.operator == '^=') {
      value = leftNumber ^ rightNumber;
    } else if (node.operator == '|=') {
      value = leftNumber | rightNumber;
    } else {
      throw 'Unknown assignment expression: ' + node.operator;
    }
    value = this.createPrimitive(value);
    this.setValue(leftSide, value);
    this.stateStack[0].value = value;
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
    var leftSide = state.leftValue;
    var rightSide = state.value;
    var value;
    if (node.operator == '==' || node.operator == '!=') {
      if (leftSide.isPrimitive && rightSide.isPrimitive) {
        value = leftSide.data == rightSide.data;
      } else {
        // TODO: Other types.
        value = leftValue == rightValue;
      }
      if (node.operator == '!=') {
        value = !value;
      }
    } else if (node.operator == '===' || node.operator == '!==') {
      if (leftSide.isPrimitive && rightSide.isPrimitive) {
        value = leftSide.data === rightSide.data;
      } else {
        value = leftSide === rightSide;
      }
      if (node.operator == '!==') {
        value = !value;
      }
    } else if (node.operator == '>') {
      if (leftSide.isPrimitive && rightSide.isPrimitive) {
        value = leftSide.data > rightSide.data;
      } else {
        value = false;
      }
    } else if (node.operator == '>=') {
      if (leftSide.isPrimitive && rightSide.isPrimitive) {
        value = leftSide.data >= rightSide.data;
      } else {
        value = false;
      }
    } else if (node.operator == '<') {
      if (leftSide.isPrimitive && rightSide.isPrimitive) {
        value = leftSide.data < rightSide.data;
      } else {
        value = false;
      }
    } else if (node.operator == '<=') {
      if (leftSide.isPrimitive && rightSide.isPrimitive) {
        value = leftSide.data <= rightSide.data;
      } else {
        value = false;
      }
    } else if (node.operator == '+') {
      if (leftSide.type == 'string' || rightSide.type == 'string') {
        var leftValue = leftSide.toString();
        var rightValue = rightSide.toString();
      } else {
        var leftValue = leftSide.toNumber();
        var rightValue = rightSide.toNumber();
      }
      value = leftValue + rightValue;
    } else if (node.operator == 'in') {
      value = this.hasProperty(rightSide, leftSide);
    } else {
      var leftValue = leftSide.toNumber();
      var rightValue = rightSide.toNumber();
      if (node.operator == '-') {
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
    }
    this.stateStack[0].value = this.createPrimitive(value);
  }
};

Interpreter.prototype['stepBreakStatement'] = function() {
  do {
    var state = this.stateStack.shift();
    if (!state) {
      throw new SyntaxError('Illegal break statement');
    }
  } while (!state.isLoop)
};

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

Interpreter.prototype['stepCallExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.doneCallee) {
    state.doneCallee = true;
    this.stateStack.unshift({node: node.callee});
  } else {
    if (!state.func) {
      state.func = state.value;
      if (!state.func || state.func.type != 'function') {
        throw new TypeError((state.func && state.func.type) +
                            ' is not a function');
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
      if (state.func.node) {
        var scope =
            this.createScope(state.func.node.body, state.func.parentScope);
        // Add all arguments.
        for (var i = 0; i < state.func.node.params.length; i++) {
          var paramName = this.createPrimitive(state.func.node.params[i].name);
          var paramValue = state.arguments.length > i ? state.arguments[i] :
              this.createPrimitive(undefined);
          this.setProperty(scope, paramName, paramValue);
        }
        // Build arguments variable.
        var argsList = this.createValue(Array);
        for (var i = 0; i < state.arguments.length; i++) {
          this.setProperty(argsList, this.createPrimitive(i),
                           state.arguments[i]);
        }
        this.setProperty(scope, this.createPrimitive('arguments'), argsList);
        var funcState = {node: state.func.node.body, scope: scope};
        this.stateStack.unshift(funcState);
      } else if (state.func.nativeFunc) {
        state.value = state.func.nativeFunc.apply(null, state.arguments);
      }
    } else {
      this.stateStack.shift();
      this.stateStack[0].value = state.value;
    }
  }
};

Interpreter.prototype['stepConditionalExpression'] = function() {
  var state = this.stateStack[0];
  if (!state.done) {
    if (!state.test) {
      state.test = true;
      this.stateStack.unshift({node: state.node.test});
    } else {
      state.done = true;
      if (state.value.toBoolean() && state.node.consequent) {
        this.stateStack.unshift({node: state.node.consequent});
      } else if (!state.value.toBoolean() && state.node.alternate) {
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

Interpreter.prototype['stepContinueStatement'] = function() {
  do {
    this.stateStack.shift();
    if (!this.stateStack.length) {
      throw new SyntaxError('Illegal continue statement');
    }
  } while (!this.stateStack[0].isLoop)
};

Interpreter.prototype['stepDoWhileStatement'] = function() {
  var state = this.stateStack[0];
  state.isLoop = true;
  if (state.node.type == 'DoWhileStatement' && state.test === undefined) {
    // First iteration of do/while executes without checking test.
    state.value = this.createPrimitive(true);
    state.test = true;
  }
  if (!state.test) {
    state.test = true;
    this.stateStack.unshift({node: state.node.test});
  } else {
    state.test = false;
    if (!state.value.toBoolean()) {
      this.stateStack.shift();
    } else if (state.node.body) {
      this.stateStack.unshift({node: state.node.body});
    }
  }
};

Interpreter.prototype['stepEmptyStatement'] = function() {
  this.stateStack.shift();
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

Interpreter.prototype['stepForStatement'] = function() {
  var state = this.stateStack[0];
  state.isLoop = true;
  var node = state.node;
  var mode = state.mode || 0;
  if (mode == 0) {
    state.mode = 1;
    if (node.init) {
      this.stateStack.unshift({node: node.init});
    }
  } else if (mode == 1) {
    state.mode = 2;
    if (node.test) {
      this.stateStack.unshift({node: node.test});
    }
  } else if (mode == 2) {
    state.mode = 3;
    if (!state.value.toBoolean()) {
      // Loop complete.  Bail out.
      this.stateStack.shift();
    } else if (node.body) {
      this.stateStack.unshift({node: node.body});
    }
  } else if (mode == 3) {
    state.mode = 1;
    if (node.update) {
      this.stateStack.unshift({node: node.update});
    }
  }
};

Interpreter.prototype['stepFunctionDeclaration'] = function() {
  this.stateStack.shift();
};

Interpreter.prototype['stepFunctionExpression'] = function() {
  var state = this.stateStack[0];
  this.stateStack.shift();
  this.stateStack[0].value = this.createFunction(state.node);
};

Interpreter.prototype['stepIdentifier'] = function() {
  var state = this.stateStack[0];
  this.stateStack.shift();
  var name = this.createPrimitive(state.node.name);
  this.stateStack[0].value = state.assign ? name : this.getValueFromScope(name);
};

Interpreter.prototype['stepIfStatement'] =
    Interpreter.prototype['stepConditionalExpression'];

Interpreter.prototype['stepLiteral'] = function() {
  var state = this.stateStack[0];
  this.stateStack.shift();
  this.stateStack[0].value = this.createPrimitive(state.node.value);
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
    if ((node.operator == '&&' && !state.value.toBoolean()) ||
        (node.operator == '||' && state.value.toBoolean())) {
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

Interpreter.prototype['stepMemberExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.doneObject) {
    state.doneObject = true;
    this.stateStack.unshift({node: node.object});
  } else if (!state.doneProperty) {
    state.doneProperty = true;
    state.object = state.value;
    this.stateStack.unshift({node: node.property, assign: true});
  } else {
    this.stateStack.shift();
    if (state.assign) {
      this.stateStack[0].value = [state.object, state.value];
    } else {
      this.stateStack[0].value = this.getProperty(state.object, state.value);
    }
  }
};

Interpreter.prototype['stepObjectExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  var valueToggle = state.valueToggle;
  var n = state.n || 0;
  if (!state.object) {
    state.object = this.createValue(Object);
  } else {
    if (valueToggle) {
      var key = state.value;
      if (typeof key == 'string') {
        key = this.createPrimitive(key);
      }
      state.key = key;
    } else {
      this.setProperty(state.object, state.key, state.value);
    }
  }
  if (node.properties[n]) {
    if (valueToggle) {
      state.n = n + 1;
      this.stateStack.unshift({node: node.properties[n].value});
    } else {
      this.stateStack.unshift({node: node.properties[n].key, assign: true});
    }
    state.valueToggle = !valueToggle;
  } else {
    this.stateStack.shift();
    this.stateStack[0].value = state.object;
  }
};

Interpreter.prototype['stepProgram'] =
    Interpreter.prototype['stepBlockStatement'];

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
        throw new SyntaxError('Illegal return statement');
      }
      state = this.stateStack[0];
    } while (state.node.type != 'CallExpression');
    state.value = value;
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

Interpreter.prototype['stepThrowStatement'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.argument) {
    state.argument = true;
    this.stateStack.unshift({node: node.argument});
  } else {
    throw state.value.toString();
  }
};

Interpreter.prototype['stepUnaryExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.done) {
    state.done = true;
    var nextState = {node: node.argument};
    if (node.operator == 'delete') {
      nextState.assign = true;
    }
    this.stateStack.unshift(nextState);
  } else {
    this.stateStack.shift();
    var value;
    if (node.operator == '-') {
      value = -state.value.toNumber();
    } else if (node.operator == '!') {
      value = !state.value.toNumber();
    } else if (node.operator == '~') {
      value = ~state.value.toNumber();
    } else if (node.operator == 'typeof') {
      value = typeof state.value.type;
    } else if (node.operator == 'delete') {
      if (state.value instanceof Array) {
        var obj = state.value[0];
        var name = state.value[1];
      } else {
        var obj = this.getScope();
        var name = state.value;
      }
      value = this.deleteProperty(obj, name);
    } else if (node.operator == 'void') {
      value = undefined;
    } else {
      throw 'Unknown unary operator: ' + node.operator;
    }
    this.stateStack[0].value = this.createPrimitive(value);
  }
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
    this.setValue(this.createPrimitive(node.id.name), state.value);
    this.stateStack.shift();
  }
};

Interpreter.prototype['stepUpdateExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.done) {
    state.done = true;
    this.stateStack.unshift({node: node.argument, assign: true});
  } else {
    this.stateStack.shift();
    var leftSide = state.value;
    var leftValue = this.getValue(leftSide).toNumber();
    var changeValue;
    if (node.operator == '++') {
      changeValue = this.createPrimitive(leftValue + 1);
    } else if (node.operator == '--') {
      changeValue = this.createPrimitive(leftValue - 1);
    } else {
      throw 'Unknown update expression: ' + node.operator;
    }
    this.setValue(leftSide, changeValue);
    var returnValue = node.prefix ? returnValue : leftValue;
    this.stateStack[0].value = this.createPrimitive(returnValue);
  }
};

Interpreter.prototype['stepWhileStatement'] =
    Interpreter.prototype['stepDoWhileStatement'];
