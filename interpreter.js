/**
 * JavaScript Interpreter
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
  this.UNDEFINED = this.createPrimitive(undefined);
  this.ast = acorn.parse(code);
  var scope = this.createScope(this.ast, null);
  this.stateStack = [{node: this.ast, scope: scope, thisExpression: scope}];
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
                   this.UNDEFINED, true);
  this.setProperty(scope, this.createPrimitive('window'),
                   scope, true);
  this.setProperty(scope, this.createPrimitive('self'),
                   scope, false); // Editable.

  // Initialize global objects.
  this.initFunction(scope);
  this.initObject(scope);
  // Unable to set scope's parent prior (this.OBJECT did not exist).
  scope.parent = this.OBJECT;
  this.initArray(scope);
  this.initMath(scope);

  // Initialize global functions.
  var thisInterpreter = this;
  var wrapper;
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
  wrapper = function() {
    return function(code) {return thisInterpreter.evalFunction_(code);};
  };
  this.setProperty(scope, this.createPrimitive('eval'),
                   this.createNativeFunction(wrapper()));
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
};

/**
 * Initialize the Function class.
 * @param {!Object} scope Global scope.
 */
Interpreter.prototype.initFunction = function(scope) {
  this.FUNCTION = this.createObject(null);
  this.setProperty(scope, this.createPrimitive('Function'), this.FUNCTION);
  // Manually setup type and prototype becuase createObj doesn't recognize
  // this object as a function (this.FUNCTION did not exist).
  this.FUNCTION.type = 'function';
  this.setProperty(this.FUNCTION, this.createPrimitive('prototype'),
      this.createObject(null));
};

/**
 * Initialize the Object class.
 * @param {!Object} scope Global scope.
 */
Interpreter.prototype.initObject = function(scope) {
  this.OBJECT = this.createObject(this.FUNCTION);
  this.setProperty(scope, this.createPrimitive('Object'), this.OBJECT);
};

/**
 * Initialize the Array class.
 * @param {!Object} scope Global scope.
 */
Interpreter.prototype.initArray = function(scope) {
  var thisInterpreter = this;
  var wrapper;
  // Array constructor.
  wrapper = function(var_args) {
    if (this.parent == thisInterpreter.ARRAY) {
      // Called with new.
      var newArray = this;
    } else {
      var newArray = thisInterpreter.createObject(thisInterpreter.ARRAY);
    }
    var first = arguments[0];
    if (first && first.type == 'number') {
      if (isNaN(thisInterpreter.arrayIndex(first))) {
        throw new RangeError('Invalid array length');
      }
      newArray.length = first.data;
    } else {
      for (var i = 0; i < arguments.length; i++) {
        newArray.properties[i] = arguments[i];
      }
      newArray.length = i;
    }
    return newArray;
  };
  this.ARRAY = this.createNativeFunction(wrapper);
  this.setProperty(scope, this.createPrimitive('Array'), this.ARRAY);

  wrapper = function() {
    if (this.length) {
      var value = this.properties[this.length - 1];
      delete this.properties[this.length - 1];
      this.length--;
    } else {
      var value = thisInterpreter.UNDEFINED;
    }
    return value;
  };
  this.setProperty(this.ARRAY.properties.prototype,
                   this.createPrimitive('pop'),
                   this.createNativeFunction(wrapper));

  wrapper = function(var_args) {
    for (var i = 0; i < arguments.length; i++) {
      this.properties[this.length] = arguments[i];
      this.length++;
    }
    return thisInterpreter.createPrimitive(this.length);
  };
  this.setProperty(this.ARRAY.properties.prototype,
                   this.createPrimitive('push'),
                   this.createNativeFunction(wrapper));

  wrapper = function() {
    if (this.length) {
      var value = this.properties[0];
      for (var i = 1; i < this.length; i++) {
        this.properties[i - 1] = this.properties[i];
      }
      this.length--;
      delete this.properties[this.length];
    } else {
      var value = thisInterpreter.UNDEFINED;
    }
    return value;
  };
  this.setProperty(this.ARRAY.properties.prototype,
                   this.createPrimitive('shift'),
                   this.createNativeFunction(wrapper));

  wrapper = function(var_args) {
    for (var i = this.length - 1; i >= 0; i--) {
      this.properties[i + arguments.length] = this.properties[i];
    }
    this.length += arguments.length;
    for (var i = 0; i < arguments.length; i++) {
      this.properties[i] = arguments[i];
    }
    return thisInterpreter.createPrimitive(this.length);
  };
  this.setProperty(this.ARRAY.properties.prototype,
                   this.createPrimitive('unshift'),
                   this.createNativeFunction(wrapper));

  wrapper = function() {
    for (var i = 0; i < this.length / 2; i++) {
      var tmp = this.properties[this.length - i - 1]
      this.properties[this.length - i - 1] = this.properties[i];
      this.properties[i] = tmp;
    }
    return thisInterpreter.UNDEFINED;
  };
  this.setProperty(this.ARRAY.properties.prototype,
                   this.createPrimitive('reverse'),
                   this.createNativeFunction(wrapper));

  wrapper = function(index, howmany, var_args) {
    index = index.toNumber();
    if (index < 0) {
      index = Math.max(this.length + index, 0);
    } else {
      index = Math.min(index, this.length);
    }
    howmany = Math.min(howmany.toNumber(), this.length - index);
    var removed = thisInterpreter.createObject(thisInterpreter.ARRAY);
    // Remove specified elements.
    for (var i = index; i < this.length - howmany; i++) {
      removed.properties[removed.length++] = this.properties[i];
      this.properties[i] = this.properties[i + howmany];
    }
    for (var i = index + howmany; i < this.length; i++) {
      delete this.properties[i];
    }
    this.length -= howmany;
    // Insert specified items.
    for (var i = this.length - 1; i >= index; i--) {
      this.properties[i + arguments.length - 2] = this.properties[i];
    }
    this.length += arguments.length - 2;
    for (var i = 2; i < arguments.length; i++) {
      this.properties[index + i - 2] = arguments[i];
    }
    return removed;
  };
  this.setProperty(this.ARRAY.properties.prototype,
                   this.createPrimitive('splice'),
                   this.createNativeFunction(wrapper));

  wrapper = function(opt_separator) {
    if (!opt_separator || opt_separator.data === undefined) {
      var sep = undefined;
    } else {
      var sep = opt_separator.toString();
    }
    var text = [];
    for (var i = 0; i < this.length; i++) {
      text[i] = this.properties[i];
    }
    return thisInterpreter.createPrimitive(text.join(sep));
  };
  this.setProperty(this.ARRAY.properties.prototype,
                   this.createPrimitive('join'),
                   this.createNativeFunction(wrapper));
};

/**
 * Initialize Math object.
 * @param {!Object} scope Global scope.
 */
Interpreter.prototype.initMath = function(scope) {
  var myMath = this.createObject(this.OBJECT);
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
    var wrapper = (function(nativeFunc) {
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
 * Evaluate the provided code.
 * @param {Object} Code to be evaluated.
 * @return {!Object} Evaluated output.
 * @private
 */
Interpreter.prototype.evalFunction_ = function(code) {
  if (!code) {
    return this.UNDEFINED;
  }
  var evalInterpreter = new Interpreter(code.toString());
  evalInterpreter.stateStack[0].scope.parentScope = this.getScope();
  evalInterpreter.run();
  return evalInterpreter.value || this.UNDEFINED;
};

/**
 * Is an object of a certain class?
 * @param {Object} child Object to check.
 * @param {!Object} parent Class of object.
 * @return {boolean} True if object is the class or inherits from it.
 *     False otherwise.
 */
Interpreter.prototype.isa = function(child, parent) {
  if (!child || !parent) {
    return false;
  } else if (child.parent == parent) {
    return true;
  } else if (!child.parent || !child.parent.prototype) {
    return false;
  }
  return this.isa(child.parent.prototype, parent);
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
 * @param {Object} parent Parent constructor function.
 * @return {!Object} New data object.
 */
Interpreter.prototype.createObject = function(parent) {
  var obj = {
    isPrimitive: false,
    type: 'object',
    parent: parent,
    fixed: Object.create(null),
    properties: Object.create(null),
    toBoolean: function() {return true;},
    toNumber: function() {return 0;},
    toString: function() {return '[Object]';}
  };
  // Functions have prototype objects.
  if (this.isa(obj, this.FUNCTION)) {
    obj.type = 'function';
    this.setProperty(obj, this.createPrimitive('prototype'),
        this.createObject(this.OBJECT || null));
  };
  // Arrays have length.
  if (this.isa(obj, this.ARRAY)) {
    obj.length = 0;
  };

  return obj;
};

/**
 * Create a new function.
 * @param {Object} node AST node defining the function.
 * @param {Object} opt_scope Optional parent scope.
 * @return {!Object} New function.
 */
Interpreter.prototype.createFunction = function(node, opt_scope) {
  var func = this.createObject(this.FUNCTION);
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
  var func = this.createObject(this.FUNCTION);
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
  // Special cases for magic length property.
  if (obj.isPrimitive && name.toString() == 'length' &&
      obj.type == 'string') {
    return this.createPrimitive(obj.data.length);
  } else if (!obj.isPrimitive && name.toString() == 'length' &&
      this.isa(obj, this.ARRAY)) {
    return this.createPrimitive(obj.length);
  }
  while (obj) {
    if (obj.properties && name.toString() in obj.properties) {
      return obj.properties[name.toString()];
    }
    if (obj.parent && obj.parent.properties &&
        obj.parent.properties.prototype) {
      obj = obj.parent.properties.prototype;
    } else {
      obj = null;
    }
  }
  return this.UNDEFINED;
};

/**
 * Does the named property exist on a data object.
 * @param {!Object} obj Data object.
 * @param {!Object} name Name of property.
 * @return {boolean} True if property exists.
 */
Interpreter.prototype.hasProperty = function(obj, name) {
  if (name.toString() == 'length' && (obj.isPrimitive ?
      obj.type == 'string' : this.isa(obj, this.ARRAY))) {
    return true;
  }
  while (obj) {
    if (obj.properties && name.toString() in obj.properties) {
      return true;
    }
    if (obj.parent && obj.parent.properties &&
        obj.parent.properties.prototype) {
      obj = obj.parent.properties.prototype;
    } else {
      obj = null;
    }
  }
  return false;
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
  if (this.isa(obj, this.ARRAY)) {
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
      return;  // Don't set a real length property.
    } else if (!isNaN(i = this.arrayIndex(name))) {
      // Increase length if this index is larger.
      obj.length = Math.max(obj.length, i + 1);
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
  if (name == 'length' && this.isa(obj, this.ARRAY)) {
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
  var scope = this.createObject(null);
  scope.parentScope = parentScope;
  if (!parentScope) {
    this.initGlobalScope(scope);
  }

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
  name = name.toString();
  while (scope) {
    if (this.hasProperty(scope, name)) {
      return this.setProperty(scope, name, value);
    }
    scope = scope.parentScope;
  }
  throw 'Unknown identifier: ' + name;
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
    state.array = this.createObject(this.ARRAY);
  } else {
    this.setProperty(state.array, this.createPrimitive(n - 1), state.value);
  }
  if (node.elements[n]) {
    state.n = n + 1;
    this.stateStack.unshift({node: node.elements[n]});
  } else {
    state.array.length = state.n || 0;
    this.stateStack.shift();
    this.stateStack[0].value = state.array;
  }
};

Interpreter.prototype['stepAssignmentExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.doneLeft) {
    state.doneLeft = true;
    this.stateStack.unshift({node: node.left, components: true});
  } else if (!state.doneRight) {
    state.doneRight = true;
    state.leftSide = state.value;
    this.stateStack.unshift({node: node.right});
  } else {
    this.stateStack.shift();
    var leftSide = state.leftSide;
    var rightSide = state.value;
    var value;
    if (node.operator == '=') {
      value = rightSide;
    } else {
      var leftValue = this.getValue(leftSide);
      var rightValue = rightSide;
      var leftNumber = leftValue.toNumber();
      var rightNumber = rightValue.toNumber();
      if (node.operator == '+=') {
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
    }
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
  var state = this.stateStack.shift();
  var node = state.node;
  var label = null;
  if (node.label) {
    label = node.label.name;
  }
  state = this.stateStack.shift();
  while (state && state.node.type != 'callExpression') {
    if (label ? label == state.label : state.isLoop) {
      return;
    }
    state = this.stateStack.shift();
  }
  throw new SyntaxError('Illegal break statement');
};

Interpreter.prototype['stepBlockStatement'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  var n = state.n_ || 0;
  if (node.body[n]) {
    state.n_ = n + 1;
    this.stateStack.unshift({node: node.body[n]});
  } else {
    this.stateStack.shift();
  }
};

Interpreter.prototype['stepCallExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.doneCallee_) {
    state.doneCallee_ = true;
    this.stateStack.unshift({node: node.callee, components: true});
  } else {
    if (!state.func_) {
      // Determine value of the function.
      if (state.value.type == 'function') {
        state.func_ = state.value;
      } else {
        state.func_ = this.getValue(state.value);
        if (!state.func_ || state.func_.type != 'function') {
          throw new TypeError((state.func_ && state.func_.type) +
                              ' is not a function');
        }
      }
      // Determine value of 'this' in function.
      if (state.node.type == 'NewExpression') {
        state.funcThis_ = this.createObject(state.func_);
        state.isConstructor_ = true;
      } else if (state.value instanceof Array) {
        state.funcThis_ = state.value[0];
      } else {
        state.funcThis_ =
            this.stateStack[this.stateStack.length - 1].thisExpression;
      }
      state.arguments = [];
      var n = 0;
    } else {
      var n = state.n_;
      if (state.arguments.length != node.arguments.length) {
        state.arguments[n - 1] = state.value;
      }
    }
    if (node.arguments[n]) {
      state.n_ = n + 1;
      this.stateStack.unshift({node: node.arguments[n]});
    } else if (!state.doneExec) {
      state.doneExec = true;
      if (state.func_.node) {
        var scope =
            this.createScope(state.func_.node.body, state.func_.parentScope);
        // Add all arguments.
        for (var i = 0; i < state.func_.node.params.length; i++) {
          var paramName = this.createPrimitive(state.func_.node.params[i].name);
          var paramValue = state.arguments.length > i ? state.arguments[i] :
              this.UNDEFINED;
          this.setProperty(scope, paramName, paramValue);
        }
        // Build arguments variable.
        var argsList = this.createObject(this.ARRAY);
        for (var i = 0; i < state.arguments.length; i++) {
          this.setProperty(argsList, this.createPrimitive(i),
                           state.arguments[i]);
        }
        this.setProperty(scope, this.createPrimitive('arguments'), argsList);
        var funcState = {
          node: state.func_.node.body,
          scope: scope,
          thisExpression: state.funcThis_
        };
        this.stateStack.unshift(funcState);
      } else if (state.func_.nativeFunc) {
        state.value = state.func_.nativeFunc.apply(state.funcThis_,
                                                   state.arguments);
      }
    } else {
      this.stateStack.shift();
      this.stateStack[0].value = state.isConstructor_ ?
          state.funcThis_ : state.value;
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
  var node = this.stateStack[0].node;
  var label = null;
  if (node.label) {
    label = node.label.name;
  }
  var state = this.stateStack[0];
  while (state && state.node.type != 'callExpression') {
    if (state.isLoop) {
      if (!label || (label == state.label)) {
        return;
      }
    }
    this.stateStack.shift();
    state = this.stateStack[0];
  }
  throw new SyntaxError('Illegal continue statement');
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
    // Save this value to the interpreter for use as a return value if
    // this code is inside an eval function.
    this.value = state.value;
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
  this.stateStack[0].value =
      state.components ? name : this.getValueFromScope(name);
};

Interpreter.prototype['stepIfStatement'] =
    Interpreter.prototype['stepConditionalExpression'];

Interpreter.prototype['stepLabeledStatement'] = function() {
  // No need to hit this node again on the way back up the stack.
  var state = this.stateStack.shift();
  this.stateStack.unshift({node: state.node.body,
                          label: state.node.label.name});
};

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
    this.stateStack.unshift({node: node.property, components: true});
  } else {
    this.stateStack.shift();
    if (state.components) {
      this.stateStack[0].value = [state.object, state.value];
    } else {
      this.stateStack[0].value = this.getProperty(state.object, state.value);
    }
  }
};

Interpreter.prototype['stepNewExpression'] =
    Interpreter.prototype['stepCallExpression'];

Interpreter.prototype['stepObjectExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  var valueToggle = state.valueToggle;
  var n = state.n || 0;
  if (!state.object) {
    state.object = this.createObject(this.OBJECT);
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
      this.stateStack.unshift({node: node.properties[n].key, components: true});
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

Interpreter.prototype['stepThisExpression'] = function() {
  this.stateStack.shift();
  for (var i = 0; i < this.stateStack.length; i++) {
    if (this.stateStack[i].thisExpression) {
      this.stateStack[0].value = this.stateStack[i].thisExpression;
      return;
    }
  }
  throw 'No this expression found.';
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
      nextState.components = true;
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
    this.stateStack.unshift({node: node.argument, components: true});
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
