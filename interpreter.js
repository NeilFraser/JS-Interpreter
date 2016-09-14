/**
 * @license
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
 * @param {string|!Object} code Raw JavaScript text or AST.
 * @param {Function=} opt_initFunc Optional initialization function.  Used to
 *     define APIs.  When called it is passed the interpreter object and the
 *     global scope object.
 * @constructor
 */
var Interpreter = function(code, opt_initFunc) {
  if (typeof code == 'string') {
    code = acorn.parse(code, Interpreter.PARSE_OPTIONS);
  }
  this.ast = code;
  this.initFunc_ = opt_initFunc;
  this.paused_ = false;
  this.polyfills_ = [];
  // Predefine some common primitives for performance.
  this.UNDEFINED = new Interpreter.Primitive(undefined, this);
  this.NULL = new Interpreter.Primitive(null, this);
  this.NAN = new Interpreter.Primitive(NaN, this);
  this.TRUE = new Interpreter.Primitive(true, this);
  this.FALSE = new Interpreter.Primitive(false, this);
  this.NUMBER_ZERO = new Interpreter.Primitive(0, this);
  this.NUMBER_ONE = new Interpreter.Primitive(1, this);
  this.STRING_EMPTY = new Interpreter.Primitive('', this);
  // Create and initialize the global scope.
  var scope = this.createScope(this.ast, null);
  // Fix the parent properties now that the global scope exists.
  //this.UNDEFINED.parent = undefined;
  //this.NULL.parent = undefined;
  this.NAN.parent = this.NUMBER;
  this.TRUE.parent = this.BOOLEAN;
  this.FALSE.parent = this.BOOLEAN;
  this.NUMBER_ZERO.parent = this.NUMBER;
  this.NUMBER_ONE.parent = this.NUMBER;
  this.STRING_EMPTY.parent = this.STRING;
  // Run the polyfills.
  this.ast = acorn.parse(this.polyfills_.join('\n'), Interpreter.PARSE_OPTIONS);
  this.polyfills_ = undefined;  // Allow polyfill strings to garbage collect.
  this.stripLocations_(this.ast);
  this.stateStack = [{
    node: this.ast,
    scope: scope,
    thisExpression: scope,
    done: false
  }];
  this.run();
  this.value = this.UNDEFINED;
  // Point at the main program.
  this.ast = code;
  this.stateStack = [{
    node: this.ast,
    scope: scope,
    thisExpression: scope,
    done: false
  }];
};

/**
 * @const {!Object} Configuration used for all Acorn parsing.
 */
Interpreter.PARSE_OPTIONS = {
  ecmaVersion: 5
};

/**
 * Property descriptor of readonly properties.
 */
Interpreter.READONLY_DESCRIPTOR = {
  configurable: true,
  enumerable: true,
  writable: false
};

/**
 * Property descriptor of non-enumerable properties.
 */
Interpreter.NONENUMERABLE_DESCRIPTOR = {
  configurable: true,
  enumerable: false,
  writable: true
};

/**
 * Property descriptor of readonly, non-enumerable properties.
 */
Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR = {
  configurable: true,
  enumerable: false,
  writable: false
};

/**
 * Add more code to the interpreter.
 * @param {string|!Object} code Raw JavaScript text or AST.
 */
Interpreter.prototype.appendCode = function(code) {
  var state = this.stateStack[this.stateStack.length - 1];
  if (!state || state.node.type != 'Program') {
    throw Error('Expecting original AST to start with a Program node.');
  }
  if (typeof code == 'string') {
    code = acorn.parse(code, Interpreter.PARSE_OPTIONS);
  }
  if (!code || code.type != 'Program') {
    throw Error('Expecting new AST to start with a Program node.');
  }
  this.populateScope_(code, state.scope);
  // Append the new program to the old one.
  for (var i = 0, node; node = code.body[i]; i++) {
    state.node.body.push(node);
  }
  state.done = false;
};

/**
 * Execute one step of the interpreter.
 * @return {boolean} True if a step was executed, false if no more instructions.
 */
Interpreter.prototype.step = function() {
  var state = this.stateStack[0];
  if (!state || state.node.type == 'Program' && state.done) {
    return false;
  } else if (this.paused_) {
    return true;
  }
  this['step' + state.node.type]();
  if (!state.node.end) {
    // This is polyfill code.  Keep executing until we arrive at user code.
    return this.step();
  }
  return true;
};

/**
 * Execute the interpreter to program completion.  Vulnerable to infinite loops.
 * @return {boolean} True if a execution is asynchonously blocked,
 *     false if no more instructions.
 */
Interpreter.prototype.run = function() {
  while (!this.paused_ && this.step()) {}
  return this.paused_;
};

/**
 * Initialize the global scope with buitin properties and functions.
 * @param {!Interpreter.Object} scope Global scope.
 */
Interpreter.prototype.initGlobalScope = function(scope) {
  // Initialize uneditable global properties.
  this.setProperty(scope, 'Infinity', this.createPrimitive(Infinity),
                   Interpreter.READONLY_DESCRIPTOR);
  this.setProperty(scope, 'NaN', this.NAN,
                   Interpreter.READONLY_DESCRIPTOR);
  this.setProperty(scope, 'undefined', this.UNDEFINED,
                   Interpreter.READONLY_DESCRIPTOR);
  this.setProperty(scope, 'window', scope,
                   Interpreter.READONLY_DESCRIPTOR);
  this.setProperty(scope, 'self', scope); // Editable.

  // Initialize global objects.
  this.initFunction(scope);
  this.initObject(scope);
  // Unable to set scope's parent prior (this.OBJECT did not exist).
  scope.parent = this.OBJECT;
  this.initArray(scope);
  this.initNumber(scope);
  this.initString(scope);
  this.initBoolean(scope);
  this.initDate(scope);
  this.initMath(scope);
  this.initRegExp(scope);
  this.initJSON(scope);
  this.initError(scope);

  // Initialize global functions.
  var thisInterpreter = this;
  var wrapper;
  wrapper = function(num) {
    num = num || thisInterpreter.UNDEFINED;
    return thisInterpreter.createPrimitive(isNaN(num.toNumber()));
  };
  this.setProperty(scope, 'isNaN',
                   this.createNativeFunction(wrapper));

  wrapper = function(num) {
    num = num || thisInterpreter.UNDEFINED;
    return thisInterpreter.createPrimitive(isFinite(num.toNumber()));
  };
  this.setProperty(scope, 'isFinite',
                   this.createNativeFunction(wrapper));

  this.setProperty(scope, 'parseFloat',
                   this.getProperty(this.NUMBER, 'parseFloat'));

  this.setProperty(scope, 'parseInt',
                   this.getProperty(this.NUMBER, 'parseInt'));

  var func = this.createObject(this.FUNCTION);
  func.eval = true;
  this.setProperty(func, 'length', this.NUMBER_ONE,
                   Interpreter.READONLY_DESCRIPTOR);
  this.setProperty(scope, 'eval', func);

  var strFunctions = [
    [escape, 'escape'], [unescape, 'unescape'],
    [decodeURI, 'decodeURI'], [decodeURIComponent, 'decodeURIComponent'],
    [encodeURI, 'encodeURI'], [encodeURIComponent, 'encodeURIComponent']
  ];
  for (var i = 0; i < strFunctions.length; i++) {
    wrapper = (function(nativeFunc) {
      return function(str) {
        str = (str || thisInterpreter.UNDEFINED).toString();
        try {
          str = nativeFunc(str);
        } catch (e) {
          // decodeURI('%xy') will throw an error.  Catch and rethrow.
          thisInterpreter.throwException(thisInterpreter.URI_ERROR, e.message);
        }
        return thisInterpreter.createPrimitive(str);
      };
    })(strFunctions[i][0]);
    this.setProperty(scope, strFunctions[i][1],
                     this.createNativeFunction(wrapper));
  }

  // Run any user-provided initialization.
  if (this.initFunc_) {
    this.initFunc_(this, scope);
  }
};

/**
 * Initialize the Function class.
 * @param {!Interpreter.Object} scope Global scope.
 */
Interpreter.prototype.initFunction = function(scope) {
  var thisInterpreter = this;
  var wrapper;
  // Function constructor.
  wrapper = function(var_args) {
    if (this.parent == thisInterpreter.FUNCTION) {
      // Called with new.
      var newFunc = this;
    } else {
      var newFunc = thisInterpreter.createObject(thisInterpreter.FUNCTION);
    }
    if (arguments.length) {
      var code = arguments[arguments.length - 1].toString();
    } else {
      var code = '';
    }
    var args = [];
    for (var i = 0; i < arguments.length - 1; i++) {
      args.push(arguments[i].toString());
    }
    args = args.join(', ');
    if (args.indexOf(')') != -1) {
      throw SyntaxError('Function arg string contains parenthesis');
    }
    // Interestingly, the scope for constructed functions is the global scope,
    // even if they were constructed in some other scope.
    newFunc.parentScope =
        thisInterpreter.stateStack[thisInterpreter.stateStack.length - 1].scope;
    var ast = acorn.parse('$ = function(' + args + ') {' + code + '};',
        Interpreter.PARSE_OPTIONS);
    newFunc.node = ast.body[0].expression.right;
    thisInterpreter.setProperty(newFunc, 'length',
        thisInterpreter.createPrimitive(newFunc.node.length),
        Interpreter.READONLY_DESCRIPTOR);
    return newFunc;
  };
  this.FUNCTION = this.createObject(null);
  this.setProperty(scope, 'Function', this.FUNCTION);
  // Manually setup type and prototype because createObj doesn't recognize
  // this object as a function (this.FUNCTION did not exist).
  this.FUNCTION.type = 'function';
  this.setProperty(this.FUNCTION, 'prototype', this.createObject(null));
  this.FUNCTION.nativeFunc = wrapper;

  wrapper = function(thisArg, args) {
    var state = thisInterpreter.stateStack[0];
    // Rewrite the current 'CallExpression' to apply a different function.
    state.func_ = this;
    // Assign the 'this' object.
    state.funcThis_ = thisArg;
    // Bind any provided arguments.
    state.arguments = [];
    if (args) {
      if (thisInterpreter.isa(args, thisInterpreter.ARRAY)) {
        for (var i = 0; i < args.length; i++) {
          state.arguments[i] = thisInterpreter.getProperty(args, i);
        }
      } else {
        thisInterpreter.throwException(thisInterpreter.TYPE_ERROR,
            'CreateListFromArrayLike called on non-object');
      }
    }
    state.doneArgs_ = true;
    state.doneExec_ = false;
  };
  this.setNativeFunctionPrototype(this.FUNCTION, 'apply', wrapper);

  wrapper = function(thisArg, var_args) {
    var state = thisInterpreter.stateStack[0];
    // Rewrite the current 'CallExpression' to call a different function.
    state.func_ = this;
    // Assign the 'this' object.
    state.funcThis_ = thisArg;
    // Bind any provided arguments.
    state.arguments = [];
    for (var i = 1; i < arguments.length; i++) {
      state.arguments.push(arguments[i]);
    }
    state.doneArgs_ = true;
    state.doneExec_ = false;
  };
  this.setNativeFunctionPrototype(this.FUNCTION, 'call', wrapper);

  wrapper = function(thisArg, var_args) {
    // Clone function
    var clone = thisInterpreter.createFunction(this.node, this.parentScope);
    // Assign the 'this' object.
    if (thisArg) {
      clone.boundThis_ = thisArg;
    }
    // Bind any provided arguments.
    clone.boundArgs_ = [];
    for (var i = 1; i < arguments.length; i++) {
      clone.boundArgs_.push(arguments[i]);
    }
    return clone;
  };
  this.setNativeFunctionPrototype(this.FUNCTION, 'bind', wrapper);
  // Function has no parent to inherit from, so it needs its own mandatory
  // toString and valueOf functions.
  wrapper = function() {
    return thisInterpreter.createPrimitive(this.toString());
  };
  this.setNativeFunctionPrototype(this.FUNCTION, 'toString', wrapper);
  this.setProperty(this.FUNCTION, 'toString',
      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
  wrapper = function() {
    return thisInterpreter.createPrimitive(this.valueOf());
  };
  this.setNativeFunctionPrototype(this.FUNCTION, 'valueOf', wrapper);
  this.setProperty(this.FUNCTION, 'valueOf',
      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);
};

/**
 * Initialize the Object class.
 * @param {!Interpreter.Object} scope Global scope.
 */
Interpreter.prototype.initObject = function(scope) {
  var thisInterpreter = this;
  var wrapper;
  // Object constructor.
  wrapper = function(value) {
    if (!value || value == thisInterpreter.UNDEFINED ||
        value == thisInterpreter.NULL) {
      // Create a new object.
      if (this.parent == thisInterpreter.OBJECT) {
        // Called with new.
        return this;
      } else {
        return thisInterpreter.createObject(thisInterpreter.OBJECT);
      }
    }
    if (value.isPrimitive) {
      // Wrap the value as an object.
      var obj = thisInterpreter.createObject(value.parent);
      obj.data = value.data;
      return obj;
    }
    // Return the provided object.
    return value;
  };
  this.OBJECT = this.createNativeFunction(wrapper);
  this.setProperty(scope, 'Object', this.OBJECT);

  // Static methods on Object.
  wrapper = function(obj) {
    var pseudoList = thisInterpreter.createObject(thisInterpreter.ARRAY);
    var i = 0;
    for (var key in obj.properties) {
      thisInterpreter.setProperty(pseudoList, i,
          thisInterpreter.createPrimitive(key));
      i++;
    }
    return pseudoList;
  };
  this.setProperty(this.OBJECT, 'getOwnPropertyNames',
      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);

  wrapper = function(obj) {
    var pseudoList = thisInterpreter.createObject(thisInterpreter.ARRAY);
    var i = 0;
    for (var key in obj.properties) {
      if (obj.notEnumerable[key]) {
        continue;
      }
      thisInterpreter.setProperty(pseudoList, i,
          thisInterpreter.createPrimitive(key));
      i++;
    }
    return pseudoList;
  };
  this.setProperty(this.OBJECT, 'keys',
      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);

  wrapper = function(obj, prop, descriptor) {
    prop = (prop || thisInterpreter.UNDEFINED).toString();
    if (!(descriptor instanceof Interpreter.Object)) {
      thisInterpreter.throwException(thisInterpreter.TYPE_ERROR,
          'Property description must be an object.');
      return;
    }
    if (!obj.properties[prop] && obj.preventExtensions) {
      thisInterpreter.throwException(thisInterpreter.TYPE_ERROR,
          'Can\'t define property ' + prop + ', object is not extensible');
      return;
    }
    var value = thisInterpreter.getProperty(descriptor, 'value');
    if (value == thisInterpreter.UNDEFINED) {
      value = null;
    }
    var get = thisInterpreter.getProperty(descriptor, 'get');
    var set = thisInterpreter.getProperty(descriptor, 'set');
    var nativeDescriptor = {
      configurable: thisInterpreter.pseudoToNative(
          thisInterpreter.getProperty(descriptor, 'configurable')),
      enumerable: thisInterpreter.pseudoToNative(
          thisInterpreter.getProperty(descriptor, 'enumerable')),
      writable: thisInterpreter.pseudoToNative(
          thisInterpreter.getProperty(descriptor, 'writable')),
      get: get == thisInterpreter.UNDEFINED ? undefined : get,
      set: set == thisInterpreter.UNDEFINED ? undefined : set
    };
    thisInterpreter.setProperty(obj, prop, value, nativeDescriptor);
    return obj;
  };
  this.setProperty(this.OBJECT, 'defineProperty',
      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);

  this.polyfills_.push(
"Object.defineProperty(Array.prototype, 'defineProperties', {configurable: true, value:",
  "function(obj, props) {",
    "var keys = Object.keys(props);",
    "for (var i = 0; i < keys.length; i++) {",
      "Object.defineProperty(obj, keys[i], props[keys[i]]);",
    "}",
    "return obj;",
  "}",
"});",
"");

  wrapper = function(obj, prop) {
    prop = (prop || thisInterpreter.UNDEFINED).toString();
    if (!(prop in obj.properties)) {
      return thisInterpreter.UNDEFINED;
    }
    var configurable = !obj.notConfigurable[prop];
    var enumerable = !obj.notEnumerable[prop];
    var writable = !obj.notWritable[prop];
    var getter = obj.getter[prop];
    var setter = obj.setter[prop];

    var descriptor = thisInterpreter.createObject(thisInterpreter.OBJECT);
    thisInterpreter.setProperty(descriptor, 'configurable',
        thisInterpreter.createPrimitive(configurable));
    thisInterpreter.setProperty(descriptor, 'enumerable',
        thisInterpreter.createPrimitive(enumerable));
    if (getter || setter) {
      thisInterpreter.setProperty(descriptor, 'getter', getter);
      thisInterpreter.setProperty(descriptor, 'setter', setter);
    } else {
      thisInterpreter.setProperty(descriptor, 'writable',
          thisInterpreter.createPrimitive(writable));
      thisInterpreter.setProperty(descriptor, 'value',
          thisInterpreter.getProperty(obj, prop));
    }
    return descriptor;
  };
  this.setProperty(this.OBJECT, 'getOwnPropertyDescriptor',
      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);

  wrapper = function(obj) {
    if (obj.parent && obj.parent.properties &&
        obj.parent.properties.prototype) {
      return obj.parent.properties.prototype;
    }
    return thisInterpreter.NULL;
  };
  this.setProperty(this.OBJECT, 'getPrototypeOf',
      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);

  wrapper = function(obj) {
    return thisInterpreter.createPrimitive(!obj.preventExtensions);
  };
  this.setProperty(this.OBJECT, 'isExtensible',
      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);

  wrapper = function(obj) {
    if (!obj.isPrimitive) {
      obj.preventExtensions = true;
    }
    return obj;
  };
  this.setProperty(this.OBJECT, 'preventExtensions',
      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);

  // Instance methods on Object.
  wrapper = function() {
    return thisInterpreter.createPrimitive(this.toString());
  };
  this.setNativeFunctionPrototype(this.OBJECT, 'toString', wrapper);

  wrapper = function() {
    return thisInterpreter.createPrimitive(this.toString());
  };
  this.setNativeFunctionPrototype(this.OBJECT, 'toLocaleString', wrapper);

  wrapper = function() {
    return thisInterpreter.createPrimitive(this.valueOf());
  };
  this.setNativeFunctionPrototype(this.OBJECT, 'valueOf', wrapper);

  wrapper = function(prop) {
    prop = (prop || thisInterpreter.UNDEFINED).toString();
    return (prop in this.properties) ?
        thisInterpreter.TRUE : thisInterpreter.FALSE;
  };
  this.setNativeFunctionPrototype(this.OBJECT, 'hasOwnProperty', wrapper);

  wrapper = function(prop) {
    prop = (prop || thisInterpreter.UNDEFINED).toString();
    var enumerable = prop in this.properties && !this.notEnumerable[prop];
    return thisInterpreter.createPrimitive(enumerable);
  };
  this.setNativeFunctionPrototype(this.OBJECT, 'propertyIsEnumerable', wrapper);

  wrapper = function(obj) {
    while (true) {
      if (obj.parent && obj.parent.properties &&
          obj.parent.properties.prototype) {
        obj = obj.parent.properties.prototype;
        if (obj == this) {
          return thisInterpreter.createPrimitive(true);
        }
      } else {
        // No parent, reached the top.
        return thisInterpreter.createPrimitive(false);
      }
    }
  };
  this.setNativeFunctionPrototype(this.OBJECT, 'isPrototypeOf',  wrapper);
};

/**
 * Initialize the Array class.
 * @param {!Interpreter.Object} scope Global scope.
 */
Interpreter.prototype.initArray = function(scope) {
  var thisInterpreter = this;
  var getInt = function(obj, def) {
    // Return an integer, or the default.
    var n = obj ? Math.floor(obj.toNumber()) : def;
    if (isNaN(n)) {
      n = def;
    }
    return n;
  };
  var strictComp = function(a, b) {
    // Strict === comparison.
    if (a.isPrimitive && b.isPrimitive) {
      return a.data === b.data;
    }
    return a === b;
  };
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
        thisInterpreter.throwException(thisInterpreter.RANGE_ERROR,
                                       'Invalid array length');
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
  this.setProperty(scope, 'Array', this.ARRAY);

  // Static methods on Array.
  wrapper = function(obj) {
    return thisInterpreter.createPrimitive(
        thisInterpreter.isa(obj, thisInterpreter.ARRAY));
  };
  this.setProperty(this.ARRAY, 'isArray',
      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);

  // Instance methods on Array.
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
  this.setNativeFunctionPrototype(this.ARRAY, 'pop', wrapper);

  wrapper = function(var_args) {
    for (var i = 0; i < arguments.length; i++) {
      this.properties[this.length] = arguments[i];
      this.length++;
    }
    return thisInterpreter.createPrimitive(this.length);
  };
  this.setNativeFunctionPrototype(this.ARRAY, 'push', wrapper);

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
  this.setNativeFunctionPrototype(this.ARRAY, 'shift', wrapper);

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
  this.setNativeFunctionPrototype(this.ARRAY, 'unshift', wrapper);

  wrapper = function() {
    for (var i = 0; i < this.length / 2; i++) {
      var tmp = this.properties[this.length - i - 1];
      this.properties[this.length - i - 1] = this.properties[i];
      this.properties[i] = tmp;
    }
    return this;
  };
  this.setNativeFunctionPrototype(this.ARRAY, 'reverse', wrapper);

  wrapper = function(index, howmany, var_args) {
    index = getInt(index, 0);
    if (index < 0) {
      index = Math.max(this.length + index, 0);
    } else {
      index = Math.min(index, this.length);
    }
    howmany = getInt(howmany, Infinity);
    howmany = Math.min(howmany, this.length - index);
    var removed = thisInterpreter.createObject(thisInterpreter.ARRAY);
    // Remove specified elements.
    for (var i = index; i < index + howmany; i++) {
      removed.properties[removed.length++] = this.properties[i];
      this.properties[i] = this.properties[i + howmany];
    }
    // Move other element to fill the gap.
    for (var i = index + howmany; i < this.length - howmany; i++) {
      this.properties[i] = this.properties[i + howmany];
    }
    // Delete superfluous properties.
    for (var i = this.length - howmany; i < this.length; i++) {
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
  this.setNativeFunctionPrototype(this.ARRAY, 'splice', wrapper);

  wrapper = function(opt_begin, opt_end) {
    var list = thisInterpreter.createObject(thisInterpreter.ARRAY);
    var begin = getInt(opt_begin, 0);
    if (begin < 0) {
      begin = this.length + begin;
    }
    begin = Math.max(0, Math.min(begin, this.length));
    var end = getInt(opt_end, this.length);
    if (end < 0) {
      end = this.length + end;
    }
    end = Math.max(0, Math.min(end, this.length));
    var length = 0;
    for (var i = begin; i < end; i++) {
      var element = thisInterpreter.getProperty(this, i);
      thisInterpreter.setProperty(list, length++, element);
    }
    return list;
  };
  this.setNativeFunctionPrototype(this.ARRAY, 'slice', wrapper);

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
  this.setNativeFunctionPrototype(this.ARRAY, 'join', wrapper);

  wrapper = function(var_args) {
    var list = thisInterpreter.createObject(thisInterpreter.ARRAY);
    var length = 0;
    // Start by copying the current array.
    for (var i = 0; i < this.length; i++) {
      var element = thisInterpreter.getProperty(this, i);
      thisInterpreter.setProperty(list, length++, element);
    }
    // Loop through all arguments and copy them in.
    for (var i = 0; i < arguments.length; i++) {
      var value = arguments[i];
      if (thisInterpreter.isa(value, thisInterpreter.ARRAY)) {
        for (var j = 0; j < value.length; j++) {
          var element = thisInterpreter.getProperty(value, j);
          thisInterpreter.setProperty(list, length++, element);
        }
      } else {
        thisInterpreter.setProperty(list, length++, value);
      }
    }
    return list;
  };
  this.setNativeFunctionPrototype(this.ARRAY, 'concat', wrapper);

  wrapper = function(searchElement, opt_fromIndex) {
    searchElement = searchElement || thisInterpreter.UNDEFINED;
    var fromIndex = getInt(opt_fromIndex, 0);
    if (fromIndex < 0) {
      fromIndex = this.length + fromIndex;
    }
    fromIndex = Math.max(0, fromIndex);
    for (var i = fromIndex; i < this.length; i++) {
      var element = thisInterpreter.getProperty(this, i);
      if (strictComp(element, searchElement)) {
        return thisInterpreter.createPrimitive(i);
      }
    }
    return thisInterpreter.createPrimitive(-1);
  };
  this.setNativeFunctionPrototype(this.ARRAY, 'indexOf', wrapper);

  wrapper = function(searchElement, opt_fromIndex) {
    searchElement = searchElement || thisInterpreter.UNDEFINED;
    var fromIndex = getInt(opt_fromIndex, this.length);
    if (fromIndex < 0) {
      fromIndex = this.length + fromIndex;
    }
    fromIndex = Math.min(fromIndex, this.length - 1);
    for (var i = fromIndex; i >= 0; i--) {
      var element = thisInterpreter.getProperty(this, i);
      if (strictComp(element, searchElement)) {
        return thisInterpreter.createPrimitive(i);
      }
    }
    return thisInterpreter.createPrimitive(-1);
  };
  this.setNativeFunctionPrototype(this.ARRAY, 'lastIndexOf', wrapper);

  this.polyfills_.push(
// Polyfill copied from:
// developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/every
"Object.defineProperty(Array.prototype, 'every', {configurable: true, value:",
  "function(callbackfn, thisArg) {",
    "if (this == null || typeof callbackfn !== 'function') throw new TypeError;",
    "var T, k;",
    "var O = Object(this);",
    "var len = O.length >>> 0;",
    "if (arguments.length > 1) T = thisArg;",
    "k = 0;",
    "while (k < len) {",
      "if (k in O && !callbackfn.call(T, O[k], k, O)) return false;",
      "k++;",
    "}",
    "return true;",
  "}",
"});",

// Polyfill copied from:
// developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
"Object.defineProperty(Array.prototype, 'filter', {configurable: true, value:",
  "function(fun/*, thisArg*/) {",
    "if (this === void 0 || this === null || typeof fun !== 'function') throw new TypeError;",
    "var t = Object(this);",
    "var len = t.length >>> 0;",
    "var res = [];",
    "var thisArg = arguments.length >= 2 ? arguments[1] : void 0;",
    "for (var i = 0; i < len; i++) {",
      "if (i in t) {",
        "var val = t[i];",
        "if (fun.call(thisArg, val, i, t)) res.push(val);",
      "}",
    "}",
    "return res;",
  "}",
"});",

// Polyfill copied from:
// developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
"Object.defineProperty(Array.prototype, 'forEach', {configurable: true, value:",
  "function(callback, thisArg) {",
    "if (this == null || typeof callback !== 'function') throw new TypeError;",
    "var T, k;",
    "var O = Object(this);",
    "var len = O.length >>> 0;",
    "if (arguments.length > 1) T = thisArg;",
    "k = 0;",
    "while (k < len) {",
      "if (k in O) callback.call(T, O[k], k, O);",
      "k++;",
    "}",
  "}",
"});",

// Polyfill copied from:
// developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/map
"Object.defineProperty(Array.prototype, 'map', {configurable: true, value:",
  "function(callback, thisArg) {",
    "if (this == null || typeof callback !== 'function') new TypeError;",
    "var T, A, k;",
    "var O = Object(this);",
    "var len = O.length >>> 0;",
    "if (arguments.length > 1) T = thisArg;",
    "A = new Array(len);",
    "k = 0;",
    "while (k < len) {",
      "if (k in O) A[k] = callback.call(T, O[k], k, O);",
      "k++;",
    "}",
    "return A;",
  "}",
"});",

// Polyfill copied from:
// developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce
"Object.defineProperty(Array.prototype, 'reduce', {configurable: true, value:",
  "function(callback /*, initialValue*/) {",
    "if (this == null || typeof callback !== 'function') throw new TypeError;",
    "var t = Object(this), len = t.length >>> 0, k = 0, value;",
    "if (arguments.length == 2) {",
      "value = arguments[1];",
    "} else {",
      "while (k < len && !(k in t)) k++;",
      "if (k >= len) {",
        "throw new TypeError('Reduce of empty array with no initial value');",
      "}",
      "value = t[k++];",
    "}",
    "for (; k < len; k++) {",
      "if (k in t) value = callback(value, t[k], k, t);",
    "}",
    "return value;",
  "}",
"});",

// Polyfill copied from:
// developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/ReduceRight
"Object.defineProperty(Array.prototype, 'reduceRight', {configurable: true, value:",
  "function(callback /*, initialValue*/) {",
    "if (null === this || 'undefined' === typeof this || 'function' !== typeof callback) throw new TypeError;",
    "var t = Object(this), len = t.length >>> 0, k = len - 1, value;",
    "if (arguments.length >= 2) {",
      "value = arguments[1];",
    "} else {",
      "while (k >= 0 && !(k in t)) k--;",
      "if (k < 0) {",
        "throw new TypeError('Reduce of empty array with no initial value');",
      "}",
      "value = t[k--];",
    "}",
    "for (; k >= 0; k--) {",
      "if (k in t) value = callback(value, t[k], k, t);",
    "}",
    "return value;",
  "}",
"});",

// Polyfill copied from:
// developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/some
"Object.defineProperty(Array.prototype, 'some', {configurable: true, value:",
  "function(fun/*, thisArg*/) {",
    "if (this == null || typeof fun !== 'function') throw new TypeError;",
    "var t = Object(this);",
    "var len = t.length >>> 0;",
    "var thisArg = arguments.length >= 2 ? arguments[1] : void 0;",
    "for (var i = 0; i < len; i++) {",
      "if (i in t && fun.call(thisArg, t[i], i, t)) {",
        "return true;",
      "}",
    "}",
    "return false;",
  "}",
"});",

"Object.defineProperty(Array.prototype, 'sort', {configurable: true, value:",
  "function(opt_comp) {",
    "for (var i = 0; i < this.length; i++) {",
      "var changes = 0;",
      "for (var j = 0; j < this.length - i - 1; j++) {",
        "if (opt_comp ?" +
            "opt_comp(this[j], this[j + 1]) > 0 : this[j] > this[j + 1]) {",
          "var swap = this[j];",
          "this[j] = this[j + 1];",
          "this[j + 1] = swap;",
          "changes++;",
        "}",
      "}",
      "if (changes <= 1) break;",
    "}",
    "return this;",
  "}",
"});",

"Object.defineProperty(Array.prototype, 'toLocaleString', {configurable: true, value:",
  "function() {",
    "var out = [];",
    "for (var i = 0; i < this.length; i++) {",
      "out[i] = (this[i] === null || this[i] === undefined) ? '' : this[i].toLocaleString();",
    "}",
    "return out.join(',');",
  "}",
"});",
"");
};

/**
 * Initialize the Number class.
 * @param {!Interpreter.Object} scope Global scope.
 */
Interpreter.prototype.initNumber = function(scope) {
  var thisInterpreter = this;
  var wrapper;
  // Number constructor.
  wrapper = function(value) {
    value = value ? value.toNumber() : 0;
    if (this.parent != thisInterpreter.NUMBER) {
      // Called as Number().
      return thisInterpreter.createPrimitive(value);
    }
    // Called as new Number().
    this.data = value;
    return this;
  };
  this.NUMBER = this.createNativeFunction(wrapper);
  this.setProperty(scope, 'Number', this.NUMBER);

  var numConsts = ['MAX_VALUE', 'MIN_VALUE', 'NaN', 'NEGATIVE_INFINITY',
                   'POSITIVE_INFINITY'];
  for (var i = 0; i < numConsts.length; i++) {
    this.setProperty(this.NUMBER, numConsts[i],
                     this.createPrimitive(Number[numConsts[i]]));
  }

  // Static methods on Number.
  wrapper = function(str) {
    str = str || thisInterpreter.UNDEFINED;
    return thisInterpreter.createPrimitive(parseFloat(str.toString()));
  };
  this.setProperty(this.NUMBER, 'parseFloat',
                   this.createNativeFunction(wrapper));

  wrapper = function(str, radix) {
    str = str || thisInterpreter.UNDEFINED;
    radix = radix || thisInterpreter.UNDEFINED;
    return thisInterpreter.createPrimitive(
        parseInt(str.toString(), radix.toNumber()));
  };
  this.setProperty(this.NUMBER, 'parseInt',
                   this.createNativeFunction(wrapper));

  // Instance methods on Number.
  wrapper = function(fractionDigits) {
    fractionDigits = fractionDigits ? fractionDigits.toNumber() : undefined;
    var n = this.toNumber();
    return thisInterpreter.createPrimitive(n.toExponential(fractionDigits));
  };
  this.setNativeFunctionPrototype(this.NUMBER, 'toExponential', wrapper);

  wrapper = function(digits) {
    digits = digits ? digits.toNumber() : undefined;
    var n = this.toNumber();
    return thisInterpreter.createPrimitive(n.toFixed(digits));
  };
  this.setNativeFunctionPrototype(this.NUMBER, 'toFixed', wrapper);

  wrapper = function(precision) {
    precision = precision ? precision.toNumber() : undefined;
    var n = this.toNumber();
    return thisInterpreter.createPrimitive(n.toPrecision(precision));
  };
  this.setNativeFunctionPrototype(this.NUMBER, 'toPrecision', wrapper);

  wrapper = function(radix) {
    radix = radix ? radix.toNumber() : 10;
    var n = this.toNumber();
    return thisInterpreter.createPrimitive(n.toString(radix));
  };
  this.setNativeFunctionPrototype(this.NUMBER, 'toString', wrapper);

  wrapper = function(locales, options) {
    locales = locales ? thisInterpreter.pseudoToNative(locales) : undefined;
    options = options ? thisInterpreter.pseudoToNative(options) : undefined;
    return thisInterpreter.createPrimitive(
        this.toNumber().toLocaleString(locales, options));
  };
  this.setNativeFunctionPrototype(this.NUMBER, 'toLocaleString', wrapper);
};

/**
 * Initialize the String class.
 * @param {!Interpreter.Object} scope Global scope.
 */
Interpreter.prototype.initString = function(scope) {
  var thisInterpreter = this;
  var wrapper;
  // String constructor.
  wrapper = function(value) {
    value = value ? value.toString() : '';
    if (this.parent != thisInterpreter.STRING) {
      // Called as String().
      return thisInterpreter.createPrimitive(value);
    }
    // Called as new String().
    this.data = value;
    return this;
  };
  this.STRING = this.createNativeFunction(wrapper);
  this.setProperty(scope, 'String', this.STRING);

  // Static methods on String.
  wrapper = function(var_args) {
    for (var i = 0; i < arguments.length; i++) {
      arguments[i] = arguments[i].toNumber();
    }
    return thisInterpreter.createPrimitive(
        String.fromCharCode.apply(String, arguments));
  };
  this.setProperty(this.STRING, 'fromCharCode',
      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);

  // Instance methods on String.
  // Methods with no arguments.
  var functions = ['toLowerCase', 'toUpperCase',
                   'toLocaleLowerCase', 'toLocaleUpperCase'];
  for (var i = 0; i < functions.length; i++) {
    wrapper = (function(nativeFunc) {
      return function() {
        return thisInterpreter.createPrimitive(nativeFunc.apply(this));
      };
    })(String.prototype[functions[i]]);
    this.setNativeFunctionPrototype(this.STRING, functions[i], wrapper);
  }

  // Trim function may not exist in host browser.  Write them from scratch.
  wrapper = function() {
    var str = this.toString();
    return thisInterpreter.createPrimitive(str.replace(/^\s+|\s+$/g, ''));
  };
  this.setNativeFunctionPrototype(this.STRING, 'trim', wrapper);
  wrapper = function() {
    var str = this.toString();
    return thisInterpreter.createPrimitive(str.replace(/^\s+/g, ''));
  };
  this.setNativeFunctionPrototype(this.STRING, 'trimLeft', wrapper);
  wrapper = function() {
    var str = this.toString();
    return thisInterpreter.createPrimitive(str.replace(/\s+$/g, ''));
  };
  this.setNativeFunctionPrototype(this.STRING, 'trimRight', wrapper);

  // Methods with only numeric arguments.
  functions = ['charAt', 'charCodeAt', 'substring', 'slice', 'substr'];
  for (var i = 0; i < functions.length; i++) {
    wrapper = (function(nativeFunc) {
      return function() {
        for (var j = 0; j < arguments.length; j++) {
          arguments[j] = arguments[j].toNumber();
        }
        return thisInterpreter.createPrimitive(
            nativeFunc.apply(this, arguments));
      };
    })(String.prototype[functions[i]]);
    this.setNativeFunctionPrototype(this.STRING, functions[i], wrapper);
  }

  wrapper = function(searchValue, fromIndex) {
    var str = this.toString();
    searchValue = (searchValue || thisInterpreter.UNDEFINED).toString();
    fromIndex = fromIndex ? fromIndex.toNumber() : undefined;
    return thisInterpreter.createPrimitive(
        str.indexOf(searchValue, fromIndex));
  };
  this.setNativeFunctionPrototype(this.STRING, 'indexOf', wrapper);

  wrapper = function(searchValue, fromIndex) {
    var str = this.toString();
    searchValue = (searchValue || thisInterpreter.UNDEFINED).toString();
    fromIndex = fromIndex ? fromIndex.toNumber() : undefined;
    return thisInterpreter.createPrimitive(
        str.lastIndexOf(searchValue, fromIndex));
  };
  this.setNativeFunctionPrototype(this.STRING, 'lastIndexOf', wrapper);

  wrapper = function(compareString, locales, options) {
    compareString = (compareString || thisInterpreter.UNDEFINED).toString();
    locales = locales ? thisInterpreter.pseudoToNative(locales) : undefined;
    options = options ? thisInterpreter.pseudoToNative(options) : undefined;
    return thisInterpreter.createPrimitive(
        this.toString().localeCompare(compareString, locales, options));
  };
  this.setNativeFunctionPrototype(this.STRING, 'localeCompare', wrapper);

  wrapper = function(separator, limit) {
    var str = this.toString();
    if (separator) {
      separator = thisInterpreter.isa(separator, thisInterpreter.REGEXP) ?
          separator.data : separator.toString();
    } else { // is this really necessary?
      separator = undefined;
    }
    limit = limit ? limit.toNumber() : undefined;
    var jsList = str.split(separator, limit);
    var pseudoList = thisInterpreter.createObject(thisInterpreter.ARRAY);
    for (var i = 0; i < jsList.length; i++) {
      thisInterpreter.setProperty(pseudoList, i,
          thisInterpreter.createPrimitive(jsList[i]));
    }
    return pseudoList;
  };
  this.setNativeFunctionPrototype(this.STRING, 'split', wrapper);

  wrapper = function(var_args) {
    var str = this.toString();
    for (var i = 0; i < arguments.length; i++) {
      str += arguments[i].toString();
    }
    return thisInterpreter.createPrimitive(str);
  };
  this.setNativeFunctionPrototype(this.STRING, 'concat', wrapper);

  wrapper = function(regexp) {
    var str = this.toString();
    regexp = regexp ? regexp.data : undefined;
    var match = str.match(regexp);
    if (match === null) {
      return thisInterpreter.NULL;
    }
    var pseudoList = thisInterpreter.createObject(thisInterpreter.ARRAY);
    for (var i = 0; i < match.length; i++) {
      thisInterpreter.setProperty(pseudoList, i,
          thisInterpreter.createPrimitive(match[i]));
    }
    return pseudoList;
  };
  this.setNativeFunctionPrototype(this.STRING, 'match', wrapper);

  wrapper = function(regexp) {
    var str = this.toString();
    regexp = regexp ? regexp.data : undefined;
    return thisInterpreter.createPrimitive(str.search(regexp));
  };
  this.setNativeFunctionPrototype(this.STRING, 'search', wrapper);

  wrapper = function(substr, newSubStr) {
    var str = this.toString();
    substr = (substr || thisInterpreter.UNDEFINED).valueOf();
    newSubStr = (newSubStr || thisInterpreter.UNDEFINED).toString();
    return thisInterpreter.createPrimitive(str.replace(substr, newSubStr));
  };
  this.setNativeFunctionPrototype(this.STRING, 'replace', wrapper);
};

/**
 * Initialize the Boolean class.
 * @param {!Interpreter.Object} scope Global scope.
 */
Interpreter.prototype.initBoolean = function(scope) {
  var thisInterpreter = this;
  var wrapper;
  // Boolean constructor.
  wrapper = function(value) {
    value = value ? value.toBoolean() : false;
    if (this.parent != thisInterpreter.BOOLEAN) {
      // Called as Boolean().
      return thisInterpreter.createPrimitive(value);
    }
    // Called as new Boolean().
    this.data = value;
    return this;
  };
  this.BOOLEAN = this.createNativeFunction(wrapper);
  this.setProperty(scope, 'Boolean', this.BOOLEAN);
};

/**
 * Initialize the Date class.
 * @param {!Interpreter.Object} scope Global scope.
 */
Interpreter.prototype.initDate = function(scope) {
  var thisInterpreter = this;
  var wrapper;
  // Date constructor.
  wrapper = function(a, b, c, d, e, f, h) {
    if (this.parent == thisInterpreter.DATE) {
      // Called with new.
      var newDate = this;
    } else {
      // Calling Date() as a function returns a string, no arguments are heeded.
      return thisInterpreter.createPrimitive(Date());
    }
    if (!arguments.length) {
      newDate.data = new Date();
    } else if (arguments.length == 1 && (a.type == 'string' ||
        thisInterpreter.isa(a, thisInterpreter.STRING))) {
      newDate.data = new Date(a.toString());
    } else {
      var args = [null];
      for (var i = 0; i < arguments.length; i++) {
        args[i + 1] = arguments[i] ? arguments[i].toNumber() : undefined;
      }
      newDate.data = new (Function.prototype.bind.apply(Date, args));
    }
    return newDate;
  };
  this.DATE = this.createNativeFunction(wrapper);
  this.setProperty(scope, 'Date', this.DATE);

  // Static methods on Date.
  wrapper = function() {
    return thisInterpreter.createPrimitive(new Date().getTime());
  };
  this.setProperty(this.DATE, 'now',
      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);

  wrapper = function(dateString) {
    dateString = dateString ? dateString.toString() : undefined;
    return thisInterpreter.createPrimitive(Date.parse(dateString));
  };
  this.setProperty(this.DATE, 'parse',
      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);

  wrapper = function(a, b, c, d, e, f, h) {
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args[i] = arguments[i] ? arguments[i].toNumber() : undefined;
    }
    return thisInterpreter.createPrimitive(Date.UTC.apply(Date, args));
  };
  this.setProperty(this.DATE, 'UTC',
      this.createNativeFunction(wrapper), Interpreter.NONENUMERABLE_DESCRIPTOR);

  // Instance methods on Date.
  var functions = ['getDate', 'getDay', 'getFullYear', 'getHours',
      'getMilliseconds', 'getMinutes', 'getMonth', 'getSeconds', 'getTime',
      'getTimezoneOffset', 'getUTCDate', 'getUTCDay', 'getUTCFullYear',
      'getUTCHours', 'getUTCMilliseconds', 'getUTCMinutes', 'getUTCMonth',
      'getUTCSeconds', 'getYear',
      'setDate', 'setFullYear', 'setHours', 'setMilliseconds',
      'setMinutes', 'setMonth', 'setSeconds', 'setTime', 'setUTCDate',
      'setUTCFullYear', 'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes',
      'setUTCMonth', 'setUTCSeconds', 'setYear',
      'toDateString', 'toISOString', 'toJSON', 'toGMTString',
      'toLocaleDateString', 'toLocaleString', 'toLocaleTimeString',
      'toTimeString', 'toUTCString'];
  for (var i = 0; i < functions.length; i++) {
    wrapper = (function(nativeFunc) {
      return function(var_args) {
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
          args[i] = thisInterpreter.pseudoToNative(arguments[i]);
        }
        return thisInterpreter.createPrimitive(
            this.data[nativeFunc].apply(this.data, args));
      };
    })(functions[i]);
    this.setNativeFunctionPrototype(this.DATE, functions[i], wrapper);
  }
};

/**
 * Initialize Math object.
 * @param {!Interpreter.Object} scope Global scope.
 */
Interpreter.prototype.initMath = function(scope) {
  var thisInterpreter = this;
  var myMath = this.createObject(this.OBJECT);
  this.setProperty(scope, 'Math', myMath);
  var mathConsts = ['E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'PI',
                    'SQRT1_2', 'SQRT2'];
  for (var i = 0; i < mathConsts.length; i++) {
    this.setProperty(myMath, mathConsts[i],
        this.createPrimitive(Math[mathConsts[i]]),
        Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
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
        return thisInterpreter.createPrimitive(
            nativeFunc.apply(Math, arguments));
      };
    })(Math[numFunctions[i]]);
    this.setProperty(myMath, numFunctions[i],
        this.createNativeFunction(wrapper),
        Interpreter.NONENUMERABLE_DESCRIPTOR);
  }
};

/**
 * Initialize Regular Expression object.
 * @param {!Interpreter.Object} scope Global scope.
 */
Interpreter.prototype.initRegExp = function(scope) {
  var thisInterpreter = this;
  var wrapper;
  // Regex constructor.
  wrapper = function(pattern, flags) {
    if (this.parent == thisInterpreter.REGEXP) {
      // Called with new.
      var rgx = this;
    } else {
      var rgx = thisInterpreter.createObject(thisInterpreter.REGEXP);
    }
    pattern = pattern ? pattern.toString() : '';
    flags = flags ? flags.toString() : '';
    return thisInterpreter.populateRegExp_(rgx, new RegExp(pattern, flags));
  };
  this.REGEXP = this.createNativeFunction(wrapper);
  this.setProperty(scope, 'RegExp', this.REGEXP);

  this.setProperty(this.REGEXP.properties.prototype, 'global',
      this.UNDEFINED, Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
  this.setProperty(this.REGEXP.properties.prototype, 'ignoreCase',
      this.UNDEFINED, Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
  this.setProperty(this.REGEXP.properties.prototype, 'multiline',
      this.UNDEFINED, Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
  this.setProperty(this.REGEXP.properties.prototype, 'source',
      this.createPrimitive('(?:)'),
      Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);

  wrapper = function(str) {
    str = str.toString();
    return thisInterpreter.createPrimitive(this.data.test(str));
  };
  this.setNativeFunctionPrototype(this.REGEXP, 'test', wrapper);

  wrapper = function(str) {
    str = str.toString();
    // Get lastIndex from wrapped regex, since this is settable.
    this.data.lastIndex =
        thisInterpreter.getProperty(this, 'lastIndex').toNumber();
    var match = this.data.exec(str);
    thisInterpreter.setProperty(this, 'lastIndex',
        thisInterpreter.createPrimitive(this.data.lastIndex));

    if (match) {
      var result = thisInterpreter.createObject(thisInterpreter.ARRAY);
      for (var i = 0; i < match.length; i++) {
        thisInterpreter.setProperty(result, i,
            thisInterpreter.createPrimitive(match[i]));
      }
      // match has additional properties.
      thisInterpreter.setProperty(result, 'index',
          thisInterpreter.createPrimitive(match.index));
      thisInterpreter.setProperty(result, 'input',
          thisInterpreter.createPrimitive(match.input));
      return result;
    }
    return thisInterpreter.NULL;
  };
  this.setNativeFunctionPrototype(this.REGEXP, 'exec', wrapper);
};

/**
 * Initialize JSON object.
 * @param {!Interpreter.Object} scope Global scope.
 */
Interpreter.prototype.initJSON = function(scope) {
  var thisInterpreter = this;
  var myJSON = thisInterpreter.createObject(this.OBJECT);
  this.setProperty(scope, 'JSON', myJSON);

  var wrapper = function(text) {
    var nativeObj = JSON.parse(text.toString());
    return thisInterpreter.nativeToPseudo(nativeObj);
  };
  this.setProperty(myJSON, 'parse', this.createNativeFunction(wrapper));

  wrapper = function(value) {
    var nativeObj = thisInterpreter.pseudoToNative(value);
    return thisInterpreter.createPrimitive(JSON.stringify(nativeObj));
  };
  this.setProperty(myJSON, 'stringify', this.createNativeFunction(wrapper));
};

/**
 * Initialize the Error class.
 * @param {!Interpreter.Object} scope Global scope.
 */
Interpreter.prototype.initError = function(scope) {
  var thisInterpreter = this;
  // Error constructor.
  this.ERROR = this.createNativeFunction(function(opt_message) {
    if (this.parent == thisInterpreter.ERROR) {
      // Called with new.
      var newError = this;
    } else {
      var newError = thisInterpreter.createObject(thisInterpreter.ERROR);
    }
    if (opt_message) {
      thisInterpreter.setProperty(newError, 'message',
          thisInterpreter.createPrimitive(String(opt_message)),
          Interpreter.NONENUMERABLE_DESCRIPTOR);
    }
    return newError;
  });
  this.setProperty(scope, 'Error', this.ERROR);
  this.setProperty(this.ERROR.properties.prototype, 'message',
      this.STRING_EMPTY, Interpreter.NONENUMERABLE_DESCRIPTOR);
  this.setProperty(this.ERROR.properties.prototype, 'name',
      this.createPrimitive('Error'), Interpreter.NONENUMERABLE_DESCRIPTOR);

  var createErrorSubclass = function(name) {
    var constructor = thisInterpreter.createNativeFunction(
        function(opt_message) {
          if (thisInterpreter.isa(this.parent, thisInterpreter.ERROR)) {
            // Called with new.
            var newError = this;
          } else {
            var newError = thisInterpreter.createObject(constructor);
          }
          if (opt_message) {
            thisInterpreter.setProperty(newError, 'message',
                thisInterpreter.createPrimitive(String(opt_message)),
                Interpreter.NONENUMERABLE_DESCRIPTOR);
          }
          return newError;
        });
    thisInterpreter.setProperty(constructor, 'prototype',
        thisInterpreter.createObject(thisInterpreter.ERROR));
    thisInterpreter.setProperty(constructor.properties.prototype, 'name',
        thisInterpreter.createPrimitive(name),
        Interpreter.NONENUMERABLE_DESCRIPTOR);
    thisInterpreter.setProperty(scope, name, constructor);

    return constructor;
  };

  this.EVAL_ERROR = createErrorSubclass('EvalError');
  this.RANGE_ERROR = createErrorSubclass('RangeError');
  this.REFERENCE_ERROR = createErrorSubclass('ReferenceError');
  this.SYNTAX_ERROR = createErrorSubclass('SyntaxError');
  this.TYPE_ERROR = createErrorSubclass('TypeError');
  this.URI_ERROR = createErrorSubclass('URIError');
};

/**
 * Is an object of a certain class?
 * @param {Object} child Object to check.
 * @param {Object} parent Constructor of object.
 * @return {boolean} True if object is the class or inherits from it.
 *     False otherwise.
 */
Interpreter.prototype.isa = function(child, parent) {
  if (!child || !parent) {
    return false;
  }
  while (child.parent != parent) {
    if (!child.parent || !child.parent.properties.prototype) {
      return false;
    }
    child = child.parent.properties.prototype;
  }
  return true;
};

/**
 * Compares two objects against each other.
 * @param {!Object} a First object.
 * @param {!Object} b Second object.
 * @return {number} -1 if a is smaller, 0 if a == b, 1 if a is bigger,
 *     NaN if they are not comparable.
 */
Interpreter.prototype.comp = function(a, b) {
  if (a.isPrimitive && typeof a == 'number' && isNaN(a.data) ||
      b.isPrimitive && typeof b == 'number' && isNaN(b.data)) {
    // NaN is not comparable to anything, including itself.
    return NaN;
  }
  if (a === b) {
    return 0;
  }
  if (a.isPrimitive && b.isPrimitive) {
    a = a.data;
    b = b.data;
  } else {
    // TODO: Handle other types.
    return NaN;
  }
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  }
  return 0;
};

/**
 * Is a value a legal integer for an array?
 * @param {*} n Value to check.
 * @return {number} Zero, or a positive integer if the value can be
 *     converted to such.  NaN otherwise.
 */
Interpreter.prototype.arrayIndex = function(n) {
  n = Number(n);
  if (!isFinite(n) || n != Math.floor(n) || n < 0) {
    return NaN;
  }
  return n;
};

/**
 * Class for a number, string, boolean, null, or undefined.
 * @param {number|string|boolean|null|undefined} data Primitive value.
 * @param {!Interpreter} interpreter The JS Interpreter to bind to.
 * @constructor
 */
Interpreter.Primitive = function(data, interpreter) {
  var type = typeof data;
  this.data = data;
  this.type = type;
  if (type == 'number') {
    this.parent = interpreter.NUMBER;
  } else if (type == 'string') {
    this.parent = interpreter.STRING;
  } else if (type == 'boolean') {
    this.parent = interpreter.BOOLEAN;
  }
};

/**
 * @type {number|string|boolean|null|undefined}
 */
Interpreter.Primitive.prototype.data = undefined;

/**
 * @type {string}
 */
Interpreter.Primitive.prototype.type = 'undefined';

/**
 * @type {Function}
 */
Interpreter.Primitive.prototype.parent = null;

/**
 * @type {boolean}
 */
Interpreter.Primitive.prototype.isPrimitive = true;

/**
 * Convert this primitive into a boolean.
 * @return {boolean} Boolean value.
 */
Interpreter.Primitive.prototype.toBoolean = function() {
  return Boolean(this.data);
};

/**
 * Convert this primitive into a number.
 * @return {number} Number value.
 */
Interpreter.Primitive.prototype.toNumber = function() {
  return Number(this.data);
};

/**
 * Convert this primitive into a string.
 * @return {string} String value.
 * @override
 */
Interpreter.Primitive.prototype.toString = function() {
  return String(this.data);
};

/**
 * Return the primitive value.
 * @return {number|string|boolean|null|undefined} Primitive value.
 * @override
 */
Interpreter.Primitive.prototype.valueOf = function() {
  return this.data;
};

/**
 * Create a new data object for a primitive.
 * @param {number|string|boolean|null|undefined|RegExp} data Data to
 *     encapsulate.
 * @return {!Interpreter.Primitive|!Interpreter.Object} New data object.
 */
Interpreter.prototype.createPrimitive = function(data) {
  // Reuse a predefined primitive constant if possible.
  if (data === undefined) {
    return this.UNDEFINED;
  } else if (data === null) {
    return this.NULL;
  } else if (data === true) {
    return this.TRUE;
  } else if (data === false) {
    return this.FALSE;
  } else if (data === 0) {
    return this.NUMBER_ZERO;
  } else if (data === 1) {
    return this.NUMBER_ONE;
  } else if (data === '') {
    return this.STRING_EMPTY;
  } else if (data instanceof RegExp) {
    return this.populateRegExp_(this.createObject(this.REGEXP), data);
  }
  return new Interpreter.Primitive(data, this);
};

/**
 * Class for an object.
 * @param {Interpreter.Object} parent Parent constructor function.
 * @constructor
 */
Interpreter.Object = function(parent) {
  this.notConfigurable = Object.create(null);
  this.notEnumerable = Object.create(null);
  this.notWritable = Object.create(null);
  this.getter = Object.create(null);
  this.setter = Object.create(null);
  this.properties = Object.create(null);
  this.parent = parent;
};

/**
 * @type {string}
 */
Interpreter.Object.prototype.type = 'object';

/**
 * @type {Interpreter.Object}
 */
Interpreter.Object.prototype.parent = null;

/**
 * @type {boolean}
 */
Interpreter.Object.prototype.isPrimitive = false;

/**
 * @type {number|string|boolean|undefined|!RegExp}
 */
Interpreter.Object.prototype.data = undefined;

/**
 * Convert this object into a boolean.
 * @return {boolean} Boolean value.
 */
Interpreter.Object.prototype.toBoolean = function() {
  return true;
};

/**
 * Convert this object into a number.
 * @return {number} Number value.
 */
Interpreter.Object.prototype.toNumber = function() {
  return Number(this.data === undefined ? this.toString() : this.data);
};

/**
 * Convert this object into a string.
 * @return {string} String value.
 * @override
 */
Interpreter.Object.prototype.toString = function() {
  return this.data === undefined ? ('[' + this.type + ']') : String(this.data);
};

/**
 * Return the object value.
 * @return {*} Value.
 * @override
 */
Interpreter.Object.prototype.valueOf = function() {
  return this.data === undefined ? this : this.data;
};

/**
 * Create a new data object.
 * @param {Interpreter.Object} parent Parent constructor function.
 * @return {!Interpreter.Object} New data object.
 */
Interpreter.prototype.createObject = function(parent) {
  var obj = new Interpreter.Object(parent);
  // Functions have prototype objects.
  if (this.isa(obj, this.FUNCTION)) {
    obj.type = 'function';
    this.setProperty(obj, 'prototype', this.createObject(this.OBJECT || null));
  }
  // Arrays have length.
  if (this.isa(obj, this.ARRAY)) {
    obj.length = 0;
    obj.toString = function() {
      var strs = [];
      for (var i = 0; i < this.length; i++) {
        var value = this.properties[i];
        strs[i] = (!value || (value.isPrimitive && (value.data === null ||
            value.data === undefined))) ? '' : value.toString();
      }
      return strs.join(',');
    };
  }
  return obj;
};

/**
 * Initialize a pseudo regular expression object based on a native regular
 * expression object.
 * @param {!Interpreter.Object} pseudoRegexp The existing object to set.
 * @param {!RegExp} nativeRegexp The native regular expression.
 * @return {!Interpreter.Object} Newly populated regular expression object.
 * @private
 */
Interpreter.prototype.populateRegExp_ = function(pseudoRegexp, nativeRegexp) {
  pseudoRegexp.data = nativeRegexp;
  // lastIndex is settable, all others are read-only attributes
  this.setProperty(pseudoRegexp, 'lastIndex',
      this.createPrimitive(nativeRegexp.lastIndex),
      Interpreter.NONENUMERABLE_DESCRIPTOR);
  this.setProperty(pseudoRegexp, 'source',
      this.createPrimitive(nativeRegexp.source),
      Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
  this.setProperty(pseudoRegexp, 'global',
      this.createPrimitive(nativeRegexp.global),
      Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
  this.setProperty(pseudoRegexp, 'ignoreCase',
      this.createPrimitive(nativeRegexp.ignoreCase),
      Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
  this.setProperty(pseudoRegexp, 'multiline',
      this.createPrimitive(nativeRegexp.multiline),
      Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
  // Override a couple of Object's conversion functions.
  pseudoRegexp.toString = function() {return String(this.data);};
  pseudoRegexp.valueOf = function() {return this.data;};
  return pseudoRegexp;
};

/**
 * Create a new function.
 * @param {Object} node AST node defining the function.
 * @param {Object=} opt_scope Optional parent scope.
 * @return {!Interpreter.Object} New function.
 */
Interpreter.prototype.createFunction = function(node, opt_scope) {
  var func = this.createObject(this.FUNCTION);
  func.parentScope = opt_scope || this.getScope();
  func.node = node;
  this.setProperty(func, 'length',
      this.createPrimitive(func.node.params.length),
      Interpreter.READONLY_DESCRIPTOR);
  return func;
};

/**
 * Create a new native function.
 * @param {!Function} nativeFunc JavaScript function.
 * @return {!Interpreter.Object} New function.
 */
Interpreter.prototype.createNativeFunction = function(nativeFunc) {
  var func = this.createObject(this.FUNCTION);
  func.nativeFunc = nativeFunc;
  this.setProperty(func, 'length', this.createPrimitive(nativeFunc.length),
      Interpreter.READONLY_DESCRIPTOR);
  return func;
};

/**
 * Create a new native asynchronous function.
 * @param {!Function} asyncFunc JavaScript function.
 * @return {!Interpreter.Object} New function.
 */
Interpreter.prototype.createAsyncFunction = function(asyncFunc) {
  var func = this.createObject(this.FUNCTION);
  func.asyncFunc = asyncFunc;
  this.setProperty(func, 'length', this.createPrimitive(asyncFunc.length),
      Interpreter.READONLY_DESCRIPTOR);
  return func;
};

/**
 * Converts from a native JS object or value to a JS interpreter object.
 * Can handle JSON-style values.
 * @param {*} nativeObj The native JS object to be converted.
 * @return {!Interpreter.Object|!Interpreter.Primitive} The equivalent
 *     JS interpreter object.
 */
Interpreter.prototype.nativeToPseudo = function(nativeObj) {
  if (typeof nativeObj == 'boolean' ||
      typeof nativeObj == 'number' ||
      typeof nativeObj == 'string' ||
      nativeObj === null || nativeObj === undefined ||
      nativeObj instanceof RegExp) {
    return this.createPrimitive(nativeObj);
  }
  var pseudoObj;
  if (nativeObj instanceof Array) {  // Array.
    pseudoObj = this.createObject(this.ARRAY);
    for (var i = 0; i < nativeObj.length; i++) {
      this.setProperty(pseudoObj, i, this.nativeToPseudo(nativeObj[i]));
    }
  } else {  // Object.
    pseudoObj = this.createObject(this.OBJECT);
    for (var key in nativeObj) {
      this.setProperty(pseudoObj, key, this.nativeToPseudo(nativeObj[key]));
    }
  }
  return pseudoObj;
};

/**
 * Converts from a JS interpreter object to native JS object.
 * Can handle JSON-style values.
 * @param {!Interpreter.Object|!Interpreter.Primitive} pseudoObj The JS
 *     interpreter object to be converted.
 * @return {*} The equivalent native JS object or value.
 */
Interpreter.prototype.pseudoToNative = function(pseudoObj) {
  if (pseudoObj.isPrimitive ||
      this.isa(pseudoObj, this.NUMBER) ||
      this.isa(pseudoObj, this.STRING) ||
      this.isa(pseudoObj, this.BOOLEAN)) {
    return pseudoObj.data;
  }
  var nativeObj;
  if (this.isa(pseudoObj, this.ARRAY)) {  // Array.
    nativeObj = [];
    for (var i = 0; i < pseudoObj.length; i++) {
      nativeObj[i] = this.pseudoToNative(pseudoObj.properties[i]);
    }
  } else {  // Object.
    nativeObj = {};
    for (var key in pseudoObj.properties) {
      nativeObj[key] = this.pseudoToNative(pseudoObj.properties[key]);
    }
  }
  return nativeObj;
};

/**
 * Fetch a property value from a data object.
 * @param {!Interpreter.Object|!Interpreter.Primitive} obj Data object.
 * @param {*} name Name of property.
 * @return {!Interpreter.Object|!Interpreter.Primitive} Property value
 *     (may be UNDEFINED).
 */
Interpreter.prototype.getProperty = function(obj, name) {
  name = name.toString();
  if (obj == this.UNDEFINED || obj == this.NULL) {
    this.throwException(this.TYPE_ERROR,
                        "Cannot read property '" + name + "' of " + obj);
  }
  // Special cases for magic length property.
  if (this.isa(obj, this.STRING)) {
    if (name == 'length') {
      return this.createPrimitive(obj.data.length);
    }
    var n = this.arrayIndex(name);
    if (!isNaN(n) && n < obj.data.length) {
      return this.createPrimitive(obj.data[n]);
    }
  } else if (this.isa(obj, this.ARRAY) && name == 'length') {
    return this.createPrimitive(obj.length);
  }
  while (true) {
    if (obj.properties && name in obj.properties) {
      var getter = obj.getter[name];
      if (getter) {
        // Flag this function as being a getter and thus needing immediate
        // execution (rather than being the value of the property).
        getter.isGetter = true;
        return getter;
      }
      return obj.properties[name];
    }
    if (obj.parent && obj.parent.properties &&
        obj.parent.properties.prototype) {
      obj = obj.parent.properties.prototype;
    } else {
      // No parent, reached the top.
      break;
    }
  }
  return this.UNDEFINED;
};

/**
 * Does the named property exist on a data object.
 * @param {!Interpreter.Object|!Interpreter.Primitive} obj Data object.
 * @param {*} name Name of property.
 * @return {boolean} True if property exists.
 */
Interpreter.prototype.hasProperty = function(obj, name) {
  name = name.toString();
  if (obj.isPrimitive) {
    throw TypeError('Primitive data type has no properties');
  }
  if (name == 'length' &&
      (this.isa(obj, this.STRING) || this.isa(obj, this.ARRAY))) {
    return true;
  }
  if (this.isa(obj, this.STRING)) {
    var n = this.arrayIndex(name);
    if (!isNaN(n) && n < obj.data.length) {
      return true;
    }
  }
  while (true) {
    if (obj.properties && name in obj.properties) {
      return true;
    }
    if (obj.parent && obj.parent.properties &&
        obj.parent.properties.prototype) {
      obj = obj.parent.properties.prototype;
    } else {
      // No parent, reached the top.
      break;
    }
  }
  return false;
};

/**
 * Set a property value on a data object.
 * @param {!Interpreter.Object} obj Data object.
 * @param {*} name Name of property.
 * @param {Interpreter.Object|Interpreter.Primitive} value
 *     New property value or null if getter/setter is described.
 * @param {Object=} opt_descriptor Optional descriptor object.
 * @return {!Interpreter.Object|undefined} Returns a setter function if one
 *     needs to be called, otherwise undefined.
 */
Interpreter.prototype.setProperty = function(obj, name, value, opt_descriptor) {
  name = name.toString();
  if (opt_descriptor && obj.notConfigurable[name]) {
    this.throwException(this.TYPE_ERROR, 'Cannot redefine property: ' + name);
  }
  if (typeof value != 'object') {
    throw Error('Failure to wrap a value: ' + value);
  }
  if (obj == this.UNDEFINED || obj == this.NULL) {
    this.throwException(this.TYPE_ERROR,
                        "Cannot set property '" + name + "' of " + obj);
  }
  if (opt_descriptor && (opt_descriptor.get || opt_descriptor.set) &&
      (value || opt_descriptor.writable !== undefined)) {
    this.throwException(this.TYPE_ERROR, 'Invalid property descriptor. ' +
        'Cannot both specify accessors and a value or writable attribute');
  }
  if (obj.isPrimitive) {
    return;
  }
  if (this.isa(obj, this.STRING)) {
    var n = this.arrayIndex(name);
    if (name == 'length' || (!isNaN(n) && n < obj.data.length)) {
      // Can't set length or letters on Strings.
      return;
    }
  }
  if (this.isa(obj, this.ARRAY)) {
    // Arrays have a magic length variable that is bound to the elements.
    var i;
    if (name == 'length') {
      // Delete elements if length is smaller.
      var newLength = this.arrayIndex(value.toNumber());
      if (isNaN(newLength)) {
        this.throwException(this.RANGE_ERROR, 'Invalid array length');
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
  if (!obj.properties[name] && obj.preventExtensions) {
    var scope = this.getScope();
    if (scope.strict) {
      this.throwException(this.TYPE_ERROR, 'Can\'t add property ' + name +
                          ', object is not extensible');
    }
    return;
  }
  if (opt_descriptor) {
    // Define the property.
    obj.properties[name] = value;
    if (!opt_descriptor.configurable) {
      obj.notConfigurable[name] = true;
    }
    var getter = opt_descriptor.get;
    if (getter) {
      obj.getter[name] = getter;
    } else {
      delete obj.getter[name];
    }
    var setter = opt_descriptor.set;
    if (setter) {
      obj.setter[name] = setter;
    } else {
      delete obj.setter[name];
    }
    var enumerable = opt_descriptor.enumerable || false;
    if (enumerable) {
      delete obj.notEnumerable[name];
    } else {
      obj.notEnumerable[name] = true;
    }
    if (getter || setter) {
      delete obj.notWritable[name];
      obj.properties[name] = this.UNDEFINED;
    } else {
      var writable = opt_descriptor.writable || false;
      if (writable) {
        delete obj.notWritable[name];
      } else {
        obj.notWritable[name] = true;
      }
    }
  } else {
    // Set the property.
    // Determine if there is a setter anywhere in the history chain.
    var parent = obj;
    while (true) {
      if (parent.setter && parent.setter[name]) {
        return parent.setter[name];
      }
      if (parent.parent && parent.parent.properties &&
          parent.parent.properties.prototype) {
        parent = parent.parent.properties.prototype;
      } else {
        // No parent, reached the top.
        break;
      }
    }
    // No setter, simple assignment.
    if (!obj.notWritable[name]) {
      obj.properties[name] = value;
    }
  }
};

/**
 * Convenience method for adding a native function as a non-enumerable property
 * onto an object's prototype.
 * @param {!Interpreter.Object} obj Data object.
 * @param {*} name Name of property.
 * @param {!Function} wrapper Function object.
 */
Interpreter.prototype.setNativeFunctionPrototype =
    function(obj, name, wrapper) {
  this.setProperty(obj.properties.prototype, name,
      this.createNativeFunction(wrapper),
      Interpreter.NONENUMERABLE_DESCRIPTOR);
};

/**
 * Delete a property value on a data object.
 * @param {!Interpreter.Object} obj Data object.
 * @param {*} name Name of property.
 * @return {boolean} True if deleted, false if undeletable.
 */
Interpreter.prototype.deleteProperty = function(obj, name) {
  name = name.toString();
  if (obj.isPrimitive || obj.notWritable[name]) {
    return false;
  }
  if (name == 'length' && this.isa(obj, this.ARRAY)) {
    return false;
  }
  return delete obj.properties[name];
};

/**
 * Returns the current scope from the stateStack.
 * @return {!Interpreter.Object} Current scope dictionary.
 */
Interpreter.prototype.getScope = function() {
  for (var i = 0; i < this.stateStack.length; i++) {
    if (this.stateStack[i].scope) {
      return this.stateStack[i].scope;
    }
  }
  throw Error('No scope found.');
};

/**
 * Create a new scope dictionary.
 * @param {!Object} node AST node defining the scope container
 *     (e.g. a function).
 * @param {Interpreter.Object} parentScope Scope to link to.
 * @return {!Interpreter.Object} New scope.
 */
Interpreter.prototype.createScope = function(node, parentScope) {
  var scope = this.createObject(null);
  scope.parentScope = parentScope;
  if (!parentScope) {
    this.initGlobalScope(scope);
  }
  this.populateScope_(node, scope);

  // Determine if this scope starts with 'use strict'.
  scope.strict = false;
  if (parentScope && parentScope.strict) {
    scope.strict = true;
  } else {
    var firstNode = node.body && node.body[0];
    if (firstNode && firstNode.expression &&
        firstNode.expression.type == 'Literal' &&
        firstNode.expression.value == 'use strict') {
      scope.strict = true;
    }
  }
  return scope;
};

/**
 * Create a new special scope dictionary. Similar to createScope(), but
 * doesn't assume that the scope is for a function body. This is used for
 * the catch clause and with statement.
 * @param {!Interpreter.Object} parentScope Scope to link to.
 * @param {Interpreter.Object=} opt_scope Optional object to transform into
 *     scope.
 * @return {!Interpreter.Object} New scope.
 */
Interpreter.prototype.createSpecialScope = function(parentScope, opt_scope) {
  if (!parentScope) {
    throw Error('parentScope required');
  }
  var scope = opt_scope || this.createObject(null);
  scope.parentScope = parentScope;
  scope.strict = parentScope.strict;
  return scope;
};


/**
 * Retrieves a value from the scope chain.
 * @param {!Interpreter.Object|!Interpreter.Primitive} name Name of variable.
 * @return {!Interpreter.Object|!Interpreter.Primitive} The value.
 */
Interpreter.prototype.getValueFromScope = function(name) {
  var scope = this.getScope();
  var nameStr = name.toString();
  while (scope) {
    if (nameStr in scope.properties) {
      return scope.properties[nameStr];
    }
    scope = scope.parentScope;
  }
  this.throwException(this.REFERENCE_ERROR, nameStr + ' is not defined');
  return this.UNDEFINED;
};

/**
 * Sets a value to the current scope.
 * @param {!Interpreter.Object|!Interpreter.Primitive} name Name of variable.
 * @param {!Interpreter.Object|!Interpreter.Primitive} value Value.
 */
Interpreter.prototype.setValueToScope = function(name, value) {
  var scope = this.getScope();
  var strict = scope.strict;
  var nameStr = name.toString();
  while (scope) {
    if ((nameStr in scope.properties) || (!strict && !scope.parentScope)) {
      if (!scope.notWritable[nameStr]) {
        scope.properties[nameStr] = value;
      }
      return;
    }
    scope = scope.parentScope;
  }
  this.throwException(this.REFERENCE_ERROR, nameStr + ' is not defined');
};

/**
 * Create a new scope for the given node.
 * @param {!Object} node AST node (program or function).
 * @param {!Interpreter.Object} scope Scope dictionary to populate.
 * @private
 */
Interpreter.prototype.populateScope_ = function(node, scope) {
  if (node.type == 'VariableDeclaration') {
    for (var i = 0; i < node.declarations.length; i++) {
      this.setProperty(scope, node.declarations[i].id.name, this.UNDEFINED);
    }
  } else if (node.type == 'FunctionDeclaration') {
    this.setProperty(scope, node.id.name, this.createFunction(node, scope));
    return;  // Do not recurse into function.
  } else if (node.type == 'FunctionExpression') {
    return;  // Do not recurse into function.
  }
  var parent = node.constructor;
  for (var name in node) {
    var prop = node[name];
    if (prop && typeof prop == 'object') {
      if (prop instanceof Array) {
        for (var i = 0; i < prop.length; i++) {
          if (prop[i] && prop[i].constructor == parent) {
            this.populateScope_(prop[i], scope);
          }
        }
      } else {
        if (prop.constructor == parent) {
          this.populateScope_(prop, scope);
        }
      }
    }
  }
};

/**
 * Remove start and end values from AST.
 * Used to remove highlighting from polyfills.
 * @param {!Object} node AST node.
 * @private
 */
Interpreter.prototype.stripLocations_ = function(node) {
  delete node.start;
  delete node.end;
  for (var name in node) {
    if (node.hasOwnProperty(name)) {
      var prop = node[name];
      if (prop && typeof prop == 'object') {
        this.stripLocations_(prop);
      }
    }
  }
};

/**
 * Gets a value from the scope chain or from an object property.
 * @param {!Interpreter.Object|!Interpreter.Primitive|!Array} left
 *     Name of variable or object/propname tuple.
 * @return {!Interpreter.Object|!Interpreter.Primitive} Value.
 */
Interpreter.prototype.getValue = function(left) {
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
 * @param {!Interpreter.Object|!Interpreter.Primitive|!Array} left
 *     Name of variable or object/propname tuple.
 * @param {!Interpreter.Object|!Interpreter.Primitive} value Value.
 * @return {!Interpreter.Object|undefined} Returns a setter function if one
 *     needs to be called, otherwise undefined.
 */
Interpreter.prototype.setValue = function(left, value) {
  if (left instanceof Array) {
    var obj = left[0];
    var prop = left[1];
    return this.setProperty(obj, prop, value);
  } else {
    this.setValueToScope(left, value);
    return undefined;
  }
};

/**
 * Throw an exception in the interpreter that can be handled by a
 * interpreter try/catch statement.  If unhandled, a real exception will
 * be thrown.  Can be called with either an error class and a message, or
 * with an actual object to be thrown.
 * @param {!Interpreter.Object} errorClass Type of error (if message is
 *   provided) or the value to throw (if no message).
 * @param {string=} opt_message Message being thrown.
 */
Interpreter.prototype.throwException = function(errorClass, opt_message) {
  if (this.stateStack[0].interpreter) {
    // This is the wrong interpreter, we are spinning on an eval.
    try {
      this.stateStack[0].interpreter.throwException(errorClass, opt_message);
      return;
    } catch (e) {
      // The eval threw an error and did not catch it.
      // Continue to see if this level can catch it.
    }
  }
  if (opt_message === undefined) {
    var error = errorClass;
  } else {
    var error = this.createObject(errorClass);
    this.setProperty(error, 'message', this.createPrimitive(opt_message),
        Interpreter.NONENUMERABLE_DESCRIPTOR);
  }
  // Search for a try statement.
  do {
    var state = this.stateStack.shift();
  } while (state && state.node.type !== 'TryStatement');
  if (state) {
    // Error is being trapped.
    this.stateStack.unshift({
      node: state.node.handler,
      throwValue: error
    });
  } else {
    // Throw a real error.
    var realError;
    if (this.isa(error, this.ERROR)) {
      var errorTable = {
        'EvalError': EvalError,
        'RangeError': RangeError,
        'ReferenceError': ReferenceError,
        'SyntaxError': SyntaxError,
        'TypeError': TypeError,
        'URIError': URIError
      };
      var type = errorTable[this.getProperty(error, 'name')] || Error;
      realError = type(this.getProperty(error, 'message'));
    } else {
      realError = error.toString();
    }
    throw realError;
  }
};

// Functions to handle each node type.

Interpreter.prototype['stepArrayExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  var n = state.n || 0;
  if (!state.array) {
    state.array = this.createObject(this.ARRAY);
  } else if (state.value) {
    this.setProperty(state.array, n - 1, state.value);
  }
  if (n < node.elements.length) {
    state.n = n + 1;
    if (node.elements[n]) {
      this.stateStack.unshift({node: node.elements[n]});
    } else {
      // [0, 1, , 3][2] -> undefined
      // Missing elements are not defined, they aren't undefined.
      state.value = undefined;
    }
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
    return;
  }
  if (!state.doneRight) {
    if (!state.leftSide) {
      state.leftSide = state.value;
    }
    if (state.doneGetter_) {
      state.leftValue = state.value;
    }
    if (!state.doneGetter_ && node.operator != '=') {
      state.leftValue = this.getValue(state.leftSide);
      if (state.leftValue.isGetter) {
        // Clear the getter flag and call the getter function.
        state.leftValue.isGetter = false;
        state.doneGetter_ = true;
        this.stateStack.unshift({
          node: {type: 'CallExpression'},
          doneCallee_: true,
          funcThis_: state.leftSide[0],
          func_: state.leftValue,
          doneArgs_: true,
          arguments: []
        });
        return;
      }
    }
    state.doneRight = true;
    this.stateStack.unshift({node: node.right});
    return;
  }
  if (state.doneSetter_) {
    // Return if setter function.
    // Setter method on property has completed.
    // Ignore its return value, and use the original set value instead.
    this.stateStack.shift();
    this.stateStack[0].value = state.doneSetter_;
    return;
  }
  var rightSide = state.value;
  var value;
  if (node.operator == '=') {
    value = rightSide;
  } else {
    var rightValue = rightSide;
    var leftNumber = state.leftValue.toNumber();
    var rightNumber = rightValue.toNumber();
    if (node.operator == '+=') {
      var left, right;
      if (state.leftValue.type == 'string' || rightValue.type == 'string') {
        left = state.leftValue.toString();
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
      throw SyntaxError('Unknown assignment expression: ' + node.operator);
    }
    value = this.createPrimitive(value);
  }
  var setter = this.setValue(state.leftSide, value);
  if (setter) {
    state.doneSetter_ = value;
    this.stateStack.unshift({
      node: {type: 'CallExpression'},
      doneCallee_: true,
      funcThis_: state.leftSide[0],
      func_: setter,
      doneArgs_: true,
      arguments: [value]
    });
    return;
  }
  // Return if no setter function.
  this.stateStack.shift();
  this.stateStack[0].value = value;
};

Interpreter.prototype['stepBinaryExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.doneLeft) {
    state.doneLeft = true;
    this.stateStack.unshift({node: node.left});
    return;
  }
  if (!state.doneRight) {
    state.doneRight = true;
    state.leftValue = state.value;
    this.stateStack.unshift({node: node.right});
    return;
  }
  this.stateStack.shift();
  var leftSide = state.leftValue;
  var rightSide = state.value;
  var value;
  var comp = this.comp(leftSide, rightSide);
  if (node.operator == '==' || node.operator == '!=') {
    if (leftSide.isPrimitive && rightSide.isPrimitive) {
      value = leftSide.data == rightSide.data;
    } else {
      value = comp === 0;
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
    value = comp == 1;
  } else if (node.operator == '>=') {
    value = comp == 1 || comp === 0;
  } else if (node.operator == '<') {
    value = comp == -1;
  } else if (node.operator == '<=') {
    value = comp == -1 || comp === 0;
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
  } else if (node.operator == 'instanceof') {
    if (!this.isa(rightSide, this.FUNCTION)) {
      this.throwException(this.TYPE_ERROR,
          'Expecting a function in instanceof check');
    }
    value = this.isa(leftSide, rightSide);
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
      throw SyntaxError('Unknown binary operator: ' + node.operator);
    }
  }
  this.stateStack[0].value = this.createPrimitive(value);
};

Interpreter.prototype['stepBlockStatement'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  var n = state.n_ || 0;
  if (node.body[n]) {
    state.done = false;
    state.n_ = n + 1;
    this.stateStack.unshift({node: node.body[n]});
  } else {
    state.done = true;
    if (state.node.type != 'Program') {
      // Leave the root scope on the tree in case the program is appended to.
      this.stateStack.shift();
    }
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
  while (state &&
         state.node.type != 'CallExpression' &&
         state.node.type != 'NewExpression') {
    if (label ? label == state.label : (state.isLoop || state.isSwitch)) {
      return;
    }
    state = this.stateStack.shift();
  }
  // Syntax error, do not allow this error to be trapped.
  throw SyntaxError('Illegal break statement');
};

Interpreter.prototype['stepCallExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.doneCallee_) {
    state.doneCallee_ = true;
    this.stateStack.unshift({node: node.callee, components: true});
    return;
  }
  if (!state.func_) {
    // Determine value of the function.
    if (state.value.type == 'function') {
      state.func_ = state.value;
    } else {
      if (state.value.length) {
        state.member_ = state.value[0];
      }
      state.func_ = this.getValue(state.value);
      if (!state.func_ || state.func_.type != 'function') {
        this.throwException(this.TYPE_ERROR,
            (state.value && state.value.type) + ' is not a function');
        return;
      }
    }
    // Determine value of 'this' in function.
    if (state.node.type == 'NewExpression') {
      state.funcThis_ = this.createObject(state.func_);
      state.isConstructor_ = true;
    } else if (state.func_.boundThis_) {
      state.funcThis_ = state.func_.boundThis_;
    } else if (state.value.length) {
      state.funcThis_ = state.value[0];
    } else {
      state.funcThis_ =
          this.stateStack[this.stateStack.length - 1].thisExpression;
    }
    if (state.func_.boundArgs_) {
      state.arguments = state.func_.boundArgs_.concat();
    } else {
      state.arguments = [];
    }
    state.n_ = 0;
  }
  if (!state.doneArgs_) {
    if (state.n_ != 0) {
      state.arguments.push(state.value);
    }
    if (node.arguments[state.n_]) {
      this.stateStack.unshift({node: node.arguments[state.n_]});
      state.n_++;
      return;
    }
    state.doneArgs_ = true;
  }
  if (!state.doneExec_) {
    state.doneExec_ = true;
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
      this.setProperty(scope, 'arguments', argsList);
      var funcState = {
        node: state.func_.node.body,
        scope: scope,
        thisExpression: state.funcThis_
      };
      this.stateStack.unshift(funcState);
      state.value = this.UNDEFINED;  // Default value if no explicit return.
    } else if (state.func_.nativeFunc) {
      state.value = state.func_.nativeFunc.apply(state.funcThis_,
                                                 state.arguments);
    } else if (state.func_.asyncFunc) {
      var thisInterpreter = this;
      var callback = function(value) {
        state.value = value || thisInterpreter.UNDEFINED;
        thisInterpreter.paused_ = false;
      };
      var argsWithCallback = state.arguments.concat(callback);
      state.func_.asyncFunc.apply(state.funcThis_, argsWithCallback);
      this.paused_ = true;
      return;
    } else if (state.func_.eval) {
      var code = state.arguments[0];
      if (!code) {
        state.value = this.UNDEFINED;
      } else if (!code.isPrimitive) {
        // JS does not parse String objects:
        // eval(new String('1 + 1')) -> '1 + 1'
        state.value = code;
      } else {
        var evalInterpreter = new Interpreter(code.toString());
        evalInterpreter.stateStack[0].scope = this.getScope();
        state = {
          node: {type: 'Eval_'},
          interpreter: evalInterpreter
        };
        this.stateStack.unshift(state);
      }
    } else {
      throw TypeError('function not a function (huh?)');
    }
  } else {
    // Execution complete.  Put the return value on the stack.
    this.stateStack.shift();
    if (state.isConstructor_ && state.value.type !== 'object') {
      this.stateStack[0].value = state.funcThis_;
    } else {
      this.stateStack[0].value = state.value;
    }
  }
};

Interpreter.prototype['stepCatchClause'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.doneBody) {
    state.doneBody = true;
    var scope;
    if (node.param) {
      scope = this.createSpecialScope(this.getScope());
      // Add the argument.
      var paramName = this.createPrimitive(node.param.name);
      this.setProperty(scope, paramName, state.throwValue);
    }
    this.stateStack.unshift({node: node.body, scope: scope});
  } else {
    this.stateStack.shift();
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
    if (state.node.type == 'ConditionalExpression') {
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
  while (state &&
         state.node.type != 'CallExpression' &&
         state.node.type != 'NewExpression') {
    if (state.isLoop) {
      if (!label || (label == state.label)) {
        return;
      }
    }
    this.stateStack.shift();
    state = this.stateStack[0];
  }
  // Syntax error, do not allow this error to be trapped.
  throw SyntaxError('Illegal continue statement');
};

Interpreter.prototype['stepDoWhileStatement'] = function() {
  var state = this.stateStack[0];
  state.isLoop = true;
  if (state.node.type == 'DoWhileStatement' && state.test === undefined) {
    // First iteration of do/while executes without checking test.
    state.value = this.TRUE;
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

Interpreter.prototype['stepEval_'] = function() {
  var state = this.stateStack[0];
  if (!state.interpreter.step()) {
    this.stateStack.shift();
    this.stateStack[0].value = state.interpreter.value || this.UNDEFINED;
  }
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

Interpreter.prototype['stepForInStatement'] = function() {
  var state = this.stateStack[0];
  state.isLoop = true;
  var node = state.node;
  if (!state.doneVariable_) {
    state.doneVariable_ = true;
    var left = node.left;
    if (left.type == 'VariableDeclaration') {
      // Inline variable declaration: for (var x in y)
      left = left.declarations[0].id;
    }
    this.stateStack.unshift({node: left, components: true});
    return;
  }
  if (!state.doneObject_) {
    state.doneObject_ = true;
    state.variable = state.value;
    this.stateStack.unshift({node: node.right});
    return;
  }
  if (typeof state.iterator == 'undefined') {
    // First iteration.
    state.object = state.value;
    state.iterator = 0;
  }
  var name = null;
  done: do {
    var i = state.iterator;
    for (var prop in state.object.properties) {
      if (state.object.notEnumerable[prop]) {
        continue;
      }
      if (i == 0) {
        name = prop;
        break done;
      }
      i--;
    }
    state.object = state.object.parent &&
        state.object.parent.properties.prototype;
    state.iterator = 0;
  } while (state.object);
  state.iterator++;
  if (name === null) {
    this.stateStack.shift();
  } else {
    this.setValueToScope(state.variable, this.createPrimitive(name));
    if (node.body) {
      this.stateStack.unshift({node: node.body});
    }
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
    if (node.test && state.value && !state.value.toBoolean()) {
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
  var state = this.stateStack.shift();
  this.stateStack[0].value = this.createFunction(state.node);
};

Interpreter.prototype['stepIdentifier'] = function() {
  var state = this.stateStack.shift();
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
  var state = this.stateStack.shift();
  this.stateStack[0].value = this.createPrimitive(state.node.value);
};

Interpreter.prototype['stepLogicalExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (node.operator != '&&' && node.operator != '||') {
    throw SyntaxError('Unknown logical operator: ' + node.operator);
  }
  if (!state.doneLeft_) {
    state.doneLeft_ = true;
    this.stateStack.unshift({node: node.left});
  } else if (!state.doneRight_) {
    if ((node.operator == '&&' && !state.value.toBoolean()) ||
        (node.operator == '||' && state.value.toBoolean())) {
      // Shortcut evaluation.
      this.stateStack.shift();
      this.stateStack[0].value = state.value;
    } else {
      state.doneRight_ = true;
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
  if (!state.doneObject_) {
    state.doneObject_ = true;
    this.stateStack.unshift({node: node.object});
  } else if (!state.doneProperty_) {
    state.doneProperty_ = true;
    state.object = state.value;
    this.stateStack.unshift({
      node: node.property,
      components: !node.computed
    });
  } else {
    this.stateStack.shift();
    if (state.components) {
      this.stateStack[0].value = [state.object, state.value];
    } else {
      var value = this.getProperty(state.object, state.value);
      if (value.isGetter) {
        // Clear the getter flag and call the getter function.
        value.isGetter = false;
        this.stateStack.unshift({
          node: {type: 'CallExpression'},
          doneCallee_: true,
          funcThis_: state.object,
          func_: value,
          doneArgs_: true,
          arguments: []
        });
      } else {
        this.stateStack[0].value = value;
      }
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
    state.properties = Object.create(null);
  } else {
    if (valueToggle) {
      state.key = state.value;
    } else {
      if (!state.properties[state.key]) {
        // Create temp object to collect value, getter, and/or setter.
        state.properties[state.key] = {};
      }
      state.properties[state.key][state.kind] = state.value;
    }
  }
  if (node.properties[n]) {
    if (valueToggle) {
      state.n = n + 1;
      this.stateStack.unshift({node: node.properties[n].value});
    } else {
      state.kind = node.properties[n].kind;
      this.stateStack.unshift({node: node.properties[n].key, components: true});
    }
    state.valueToggle = !valueToggle;
  } else {
    for (var key in state.properties) {
      var kinds = state.properties[key];
      if ('get' in kinds || 'set' in kinds) {
        // Set a property with a getter or setter.
        var descriptor = {
          configurable: true,
          enumerable: true,
          get: kinds['get'],
          set: kinds['set']
        };
        this.setProperty(state.object, key, null, descriptor);
      } else {
        // Set a normal property with a value.
        this.setProperty(state.object, key, kinds['init']);
      }
    }
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
    var value = state.value || this.UNDEFINED;
    do {
      this.stateStack.shift();
      if (this.stateStack.length == 0) {
        // Syntax error, do not allow this error to be trapped.
        throw SyntaxError('Illegal return statement');
      }
      state = this.stateStack[0];
    } while (state.node.type != 'CallExpression' &&
             state.node.type != 'NewExpression');
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

Interpreter.prototype['stepSwitchStatement'] = function() {
  var state = this.stateStack[0];
  state.checked = state.checked || [];
  state.isSwitch = true;

  if (!state.test) {
    state.test = true;
    this.stateStack.unshift({node: state.node.discriminant});
    return;
  }
  if (!state.switchValue) {
    // Preserve switch value between case tests.
    state.switchValue = state.value;
  }

  var index = state.index || 0;
  var currentCase = state.node.cases[index];
  if (currentCase) {
    if (!state.done && !state.checked[index] && currentCase.test) {
      state.checked[index] = true;
      this.stateStack.unshift({node: currentCase.test});
      return;
    }
    // Test on the default case will be null.
    if (state.done || !currentCase.test ||
        this.comp(state.value, state.switchValue) == 0) {
      state.done = true;
      var n = state.n || 0;
      if (currentCase.consequent[n]) {
        this.stateStack.unshift({node: currentCase.consequent[n]});
        state.n = n + 1;
        return;
      }
    }
    state.n = 0;
    state.index = index + 1;
  } else {
    this.stateStack.shift();
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
  throw Error('No this expression found.');
};

Interpreter.prototype['stepThrowStatement'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.argument) {
    state.argument = true;
    this.stateStack.unshift({node: node.argument});
  } else {
    this.throwException(state.value);
  }
};

Interpreter.prototype['stepTryStatement'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.doneBlock) {
    state.doneBlock = true;
    this.stateStack.unshift({node: node.block});
  } else if (!state.doneFinalizer && node.finalizer) {
    state.doneFinalizer = true;
    this.stateStack.unshift({node: node.finalizer});
  } else {
    this.stateStack.shift();
  }
};

Interpreter.prototype['stepUnaryExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.done) {
    state.done = true;
    var nextState = {node: node.argument};
    if (node.operator == 'delete' || node.operator == 'typeof') {
      nextState.components = true;
    }
    this.stateStack.unshift(nextState);
    return;
  }
  this.stateStack.shift();
  var value;
  if (node.operator == '-') {
    value = -state.value.toNumber();
  } else if (node.operator == '+') {
    value = state.value.toNumber();
  } else if (node.operator == '!') {
    value = !state.value.toBoolean();
  } else if (node.operator == '~') {
    value = ~state.value.toNumber();
  } else if (node.operator == 'delete' || node.operator == 'typeof') {
    if (state.value.length) {
      var obj = state.value[0];
      var name = state.value[1];
    } else {
      var obj = this.getScope();
      var name = state.value;
    }
    if (node.operator == 'delete') {
      value = this.deleteProperty(obj, name);
    } else {
      value = this.getProperty(obj, name).type;
    }
  } else if (node.operator == 'void') {
    value = undefined;
  } else {
    throw SyntaxError('Unknown unary operator: ' + node.operator);
  }
  this.stateStack[0].value = this.createPrimitive(value);
};

Interpreter.prototype['stepUpdateExpression'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.doneLeft) {
    state.doneLeft = true;
    this.stateStack.unshift({node: node.argument, components: true});
    return;
  }
  if (!state.leftSide) {
    state.leftSide = state.value;
  }
  if (state.doneGetter_) {
    state.leftValue = state.value;
  }
  if (!state.doneGetter_) {
    state.leftValue = this.getValue(state.leftSide);
    if (state.leftValue.isGetter) {
      // Clear the getter flag and call the getter function.
      state.leftValue.isGetter = false;
      state.doneGetter_ = true;
      this.stateStack.unshift({
        node: {type: 'CallExpression'},
        doneCallee_: true,
        funcThis_: state.leftSide[0],
        func_: state.leftValue,
        doneArgs_: true,
        arguments: []
      });
      return;
    }
  }
  if (state.doneSetter_) {
    // Return if setter function.
    // Setter method on property has completed.
    // Ignore its return value, and use the original set value instead.
    this.stateStack.shift();
    this.stateStack[0].value = state.doneSetter_;
    return;
  }
  var leftValue = state.leftValue.toNumber();
  var changeValue;
  if (node.operator == '++') {
    changeValue = this.createPrimitive(leftValue + 1);
  } else if (node.operator == '--') {
    changeValue = this.createPrimitive(leftValue - 1);
  } else {
    throw SyntaxError('Unknown update expression: ' + node.operator);
  }
  var returnValue = node.prefix ?
      changeValue : this.createPrimitive(leftValue);
  var setter = this.setValue(state.leftSide, changeValue);
  if (setter) {
    state.doneSetter_ = returnValue;
    this.stateStack.unshift({
      node: {type: 'CallExpression'},
      doneCallee_: true,
      funcThis_: state.leftSide[0],
      func_: setter,
      doneArgs_: true,
      arguments: [changeValue]
    });
    return;
  }
  // Return if no setter function.
  this.stateStack.shift();
  this.stateStack[0].value = returnValue;
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
    return;
  }
  if (node.init) {
    // This setValue call never needs to deal with calling a setter function.
    this.setValue(this.createPrimitive(node.id.name), state.value);
  }
  this.stateStack.shift();
};

Interpreter.prototype['stepWithStatement'] = function() {
  var state = this.stateStack[0];
  var node = state.node;
  if (!state.doneObject) {
    state.doneObject = true;
    this.stateStack.unshift({node: node.object});
  } else if (!state.doneBody) {
    state.doneBody = true;
    var scope = this.createSpecialScope(this.getScope(), state.value);
    this.stateStack.unshift({node: node.body, scope: scope});
  } else {
    this.stateStack.shift();
  }
};

Interpreter.prototype['stepWhileStatement'] =
    Interpreter.prototype['stepDoWhileStatement'];

// Preserve top-level API functions from being pruned by JS compilers.
// Add others as needed.
// The global object ('window' in a browser, 'global' in node.js) is 'this'.
this['Interpreter'] = Interpreter;
Interpreter.prototype['appendCode'] = Interpreter.prototype.appendCode;
Interpreter.prototype['createAsyncFunction'] =
    Interpreter.prototype.createAsyncFunction;
Interpreter.prototype['step'] = Interpreter.prototype.step;
Interpreter.prototype['run'] = Interpreter.prototype.run;
