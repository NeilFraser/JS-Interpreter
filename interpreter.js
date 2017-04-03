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
  // Declare some mock constructors to get the environment bootstrapped.
  var mockObject = {properties: {prototype: null}};
  this.NUMBER = mockObject;
  this.BOOLEAN = mockObject;
  this.STRING = mockObject;
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
  this.global = this.createScope(this.ast, null);
  // Fix the proto properties now that the global scope exists.
  //this.UNDEFINED.proto = undefined;
  //this.NULL.proto = undefined;
  this.NAN.proto = this.NUMBER.properties.prototype;
  this.TRUE.proto = this.BOOLEAN.properties.prototype;
  this.FALSE.proto = this.BOOLEAN.properties.prototype;
  this.NUMBER_ZERO.proto = this.NUMBER.properties.prototype;
  this.NUMBER_ONE.proto = this.NUMBER.properties.prototype;
  this.STRING_EMPTY.proto = this.STRING.properties.prototype;
  // Run the polyfills.
  this.ast = acorn.parse(this.polyfills_.join('\n'), Interpreter.PARSE_OPTIONS);
  this.polyfills_ = undefined;  // Allow polyfill strings to garbage collect.
  this.stripLocations_(this.ast, undefined, undefined);
  this.stateStack = [{
    node: this.ast,
    scope: this.global,
    thisExpression: this.global,
    done: false
  }];
  this.run();
  this.value = this.UNDEFINED;
  // Point at the main program.
  this.ast = code;
  this.stateStack = [{
    node: this.ast,
    scope: this.global,
    thisExpression: this.global,
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
  var state = this.stateStack[0];
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
  var state = this.stateStack[this.stateStack.length - 1];
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
 * @return {boolean} True if a execution is asynchronously blocked,
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
  // Note that in a browser this would be 'Window', whereas in Node.js it would
  // be 'Object'.  This interpreter is closer to Node in that it has no DOM.
  scope.proto = this.OBJECT.properties.prototype;
  this.setProperty(scope, 'constructor', this.OBJECT);
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
                   this.createNativeFunction(wrapper, false));

  wrapper = function(num) {
    num = num || thisInterpreter.UNDEFINED;
    return thisInterpreter.createPrimitive(isFinite(num.toNumber()));
  };
  this.setProperty(scope, 'isFinite',
                   this.createNativeFunction(wrapper, false));

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
                     this.createNativeFunction(wrapper, false));
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
  var identifierRegexp = /^[A-Za-z_$][\w$]*$/;
  // Function constructor.
  wrapper = function(var_args) {
    if (thisInterpreter.calledWithNew()) {
      // Called as new Function().
      var newFunc = this;
    } else {
      // Called as Function().
      var newFunc = thisInterpreter.createObject(thisInterpreter.FUNCTION);
    }
    if (arguments.length) {
      var code = arguments[arguments.length - 1].toString();
    } else {
      var code = '';
    }
    var args = [];
    for (var i = 0; i < arguments.length - 1; i++) {
      var name = arguments[i].toString();
      if (!name.match(identifierRegexp)) {
        thisInterpreter.throwException(thisInterpreter.SYNTAX_ERROR,
            'Invalid function argument: ' + name);
        return;
      }
      args.push(name);
    }
    args = args.join(', ');
    // Interestingly, the scope for constructed functions is the global scope,
    // even if they were constructed in some other scope.
    newFunc.parentScope = thisInterpreter.stateStack[0].scope;
    // Acorn needs to parse code in the context of a function or else 'return'
    // statements will be syntax errors.
    var ast = acorn.parse('$ = function(' + args + ') {' + code + '};',
        Interpreter.PARSE_OPTIONS);
    if (ast.body.length != 1) {
      // Function('a', 'return a + 6;}; {alert(1);');
      thisInterpreter.throwException(thisInterpreter.SYNTAX_ERROR,
          'Invalid code in function body.');
      return;
    }
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
  this.setProperty(this.FUNCTION.properties.prototype, 'constructor',
      this.FUNCTION, Interpreter.NONENUMERABLE_DESCRIPTOR);
  this.FUNCTION.nativeFunc = wrapper;

  var boxThis = function(value) {
    // In non-strict mode 'this' must be an object.
    if (value.isPrimitive && !thisInterpreter.getScope().strict) {
      if (value == thisInterpreter.UNDEFINED || value == thisInterpreter.NULL) {
        // 'Undefined' and 'null' are changed to global object.
        value = thisInterpreter.global;
      } else {
        // Primitives must be boxed in non-strict mode.
        var box = thisInterpreter.createObject(value.properties.constructor);
        box.data = value.data;
        value = box;
      }
    }
    return value;
  };

  wrapper = function(thisArg, args) {
    var state =
        thisInterpreter.stateStack[thisInterpreter.stateStack.length - 1];
    // Rewrite the current 'CallExpression' to apply a different function.
    state.func_ = this;
    // Assign the 'this' object.
    state.funcThis_ = boxThis(thisArg);
    // Bind any provided arguments.
    state.arguments_ = [];
    if (args) {
      if (thisInterpreter.isa(args, thisInterpreter.ARRAY)) {
        for (var i = 0; i < args.length; i++) {
          state.arguments_[i] = thisInterpreter.getProperty(args, i);
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
    var state =
        thisInterpreter.stateStack[thisInterpreter.stateStack.length - 1];
    // Rewrite the current 'CallExpression' to call a different function.
    state.func_ = this;
    // Assign the 'this' object.
    state.funcThis_ = boxThis(thisArg);
    // Bind any provided arguments.
    state.arguments_ = [];
    for (var i = 1; i < arguments.length; i++) {
      state.arguments_.push(arguments[i]);
    }
    state.doneArgs_ = true;
    state.doneExec_ = false;
  };
  this.setNativeFunctionPrototype(this.FUNCTION, 'call', wrapper);

  this.polyfills_.push(
// Polyfill copied from:
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_objects/Function/bind
"Object.defineProperty(Function.prototype, 'bind', {configurable: true, value:",
  "function(oThis) {",
    "if (typeof this !== 'function') {",
      "throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');",
    "}",
    "var aArgs   = Array.prototype.slice.call(arguments, 1),",
        "fToBind = this,",
        "fNOP    = function() {},",
        "fBound  = function() {",
          "return fToBind.apply(this instanceof fNOP",
                 "? this",
                 ": oThis,",
                 "aArgs.concat(Array.prototype.slice.call(arguments)));",
        "};",
    "if (this.prototype) {",
      "fNOP.prototype = this.prototype;",
    "}",
    "fBound.prototype = new fNOP();",
    "return fBound;",
  "}",
"});",
"");

  // Function has no parent to inherit from, so it needs its own mandatory
  // toString and valueOf functions.
  wrapper = function() {
    return thisInterpreter.createPrimitive(this.toString());
  };
  this.setNativeFunctionPrototype(this.FUNCTION, 'toString', wrapper);
  this.setProperty(this.FUNCTION, 'toString',
      this.createNativeFunction(wrapper, false),
      Interpreter.NONENUMERABLE_DESCRIPTOR);
  wrapper = function() {
    return thisInterpreter.createPrimitive(this.valueOf());
  };
  this.setNativeFunctionPrototype(this.FUNCTION, 'valueOf', wrapper);
  this.setProperty(this.FUNCTION, 'valueOf',
      this.createNativeFunction(wrapper, false),
      Interpreter.NONENUMERABLE_DESCRIPTOR);
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
      if (thisInterpreter.calledWithNew()) {
        // Called as new Object().
        return this;
      } else {
        // Called as Object().
        return thisInterpreter.createObject(thisInterpreter.OBJECT);
      }
    }
    if (value.isPrimitive) {
      // Wrap the value as an object.
      var obj = thisInterpreter.createObject(value.properties.constructor);
      obj.data = value.data;
      return obj;
    }
    // Return the provided object.
    return value;
  };
  this.OBJECT = this.createNativeFunction(wrapper, true);
  this.setProperty(scope, 'Object', this.OBJECT);

  // Static methods on Object.
  wrapper = function(obj) {
    var props = obj.isPrimitive ? obj.data : obj.properties;
    return thisInterpreter.nativeToPseudo(Object.getOwnPropertyNames(props));
  };
  this.setProperty(this.OBJECT, 'getOwnPropertyNames',
      this.createNativeFunction(wrapper, false),
      Interpreter.NONENUMERABLE_DESCRIPTOR);

  wrapper = function(obj) {
    if (obj.isPrimitive) {
      return thisInterpreter.nativeToPseudo(Object.keys(obj.data));
    }
    var list = [];
    for (var key in obj.properties) {
      if (!obj.notEnumerable[key]) {
        list.push(key);
      }
    }
    return thisInterpreter.nativeToPseudo(list);
  };
  this.setProperty(this.OBJECT, 'keys',
      this.createNativeFunction(wrapper, false),
      Interpreter.NONENUMERABLE_DESCRIPTOR);

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
          /** @type !Interpreter.Primitive */
          (thisInterpreter.getProperty(descriptor, 'configurable'))),
      enumerable: thisInterpreter.pseudoToNative(
          /** @type !Interpreter.Primitive */
          (thisInterpreter.getProperty(descriptor, 'enumerable'))),
      writable: thisInterpreter.pseudoToNative(
          /** @type !Interpreter.Primitive */
          (thisInterpreter.getProperty(descriptor, 'writable'))),
      get: get == thisInterpreter.UNDEFINED ? undefined : get,
      set: set == thisInterpreter.UNDEFINED ? undefined : set
    };
    thisInterpreter.setProperty(obj, prop, value, nativeDescriptor);
    return obj;
  };
  this.setProperty(this.OBJECT, 'defineProperty',
      this.createNativeFunction(wrapper, false),
      Interpreter.NONENUMERABLE_DESCRIPTOR);

  this.polyfills_.push(
"Object.defineProperty(Object.prototype, 'defineProperties', {configurable: true, value:",
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
      this.createNativeFunction(wrapper, false),
      Interpreter.NONENUMERABLE_DESCRIPTOR);

  wrapper = function(obj) {
    if (obj == thisInterpreter.UNDEFINED || obj == thisInterpreter.NULL) {
      thisInterpreter.throwException(thisInterpreter.TYPE_ERROR,
          'Cannot convert undefined or null to object');
    }
    return obj.proto || thisInterpreter.NULL;
  };
  this.setProperty(this.OBJECT, 'getPrototypeOf',
      this.createNativeFunction(wrapper, false),
      Interpreter.NONENUMERABLE_DESCRIPTOR);

  wrapper = function(obj) {
    return thisInterpreter.createPrimitive(!obj.preventExtensions);
  };
  this.setProperty(this.OBJECT, 'isExtensible',
      this.createNativeFunction(wrapper, false),
      Interpreter.NONENUMERABLE_DESCRIPTOR);

  wrapper = function(obj) {
    if (!obj.isPrimitive) {
      obj.preventExtensions = true;
    }
    return obj;
  };
  this.setProperty(this.OBJECT, 'preventExtensions',
      this.createNativeFunction(wrapper, false),
      Interpreter.NONENUMERABLE_DESCRIPTOR);

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
    if (this == thisInterpreter.NULL || this == thisInterpreter.UNDEFINED) {
      thisInterpreter.throwException(thisInterpreter.TYPE_ERROR,
          'Cannot convert undefined or null to object');
      return;
    }
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
      // Note, circular loops shouldn't be possible.
      if (obj.proto && obj.proto != obj) {
        obj = obj.proto;
        if (obj == this) {
          return thisInterpreter.TRUE;
        }
      } else {
        // No parent or self-parent; reached the top.
        return thisInterpreter.FALSE;
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
    if (thisInterpreter.calledWithNew()) {
      // Called as new Array().
      var newArray = this;
    } else {
      // Called as Array().
      var newArray = thisInterpreter.createObject(thisInterpreter.ARRAY);
    }
    var first = arguments[0];
    if (arguments.length == 1 && first.type == 'number') {
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
  this.ARRAY = this.createNativeFunction(wrapper, true);
  this.setProperty(scope, 'Array', this.ARRAY);

  // Static methods on Array.
  wrapper = function(obj) {
    return thisInterpreter.createPrimitive(
        thisInterpreter.isa(obj, thisInterpreter.ARRAY));
  };
  this.setProperty(this.ARRAY, 'isArray',
                   this.createNativeFunction(wrapper, false),
                   Interpreter.NONENUMERABLE_DESCRIPTOR);

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
    if (thisInterpreter.calledWithNew()) {
      // Called as new Number().
      this.data = value;
      return this;
    } else {
      // Called as Number().
      return thisInterpreter.createPrimitive(value);
    }
  };
  this.NUMBER = this.createNativeFunction(wrapper, true);
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
      this.createNativeFunction(wrapper, false));

  wrapper = function(str, radix) {
    str = str || thisInterpreter.UNDEFINED;
    radix = radix || thisInterpreter.UNDEFINED;
    return thisInterpreter.createPrimitive(
        parseInt(str.toString(), radix.toNumber()));
  };
  this.setProperty(this.NUMBER, 'parseInt',
      this.createNativeFunction(wrapper, false));

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
    if (thisInterpreter.calledWithNew()) {
      // Called as new String().
      this.data = value;
      return this;
    } else {
      // Called as String().
      return thisInterpreter.createPrimitive(value);
    }
  };
  this.STRING = this.createNativeFunction(wrapper, true);
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
      this.createNativeFunction(wrapper, false),
      Interpreter.NONENUMERABLE_DESCRIPTOR);

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
    if (thisInterpreter.calledWithNew()) {
      // Called as new Boolean().
      this.data = value;
      return this;
    } else {
      // Called as Boolean().
      return thisInterpreter.createPrimitive(value);
    }
  };
  this.BOOLEAN = this.createNativeFunction(wrapper, true);
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
  wrapper = function(value, var_args) {
    if (thisInterpreter.calledWithNew()) {
      // Called as new Date().
      var newDate = this;
    } else {
      // Called as Date().
      // Calling Date() as a function returns a string, no arguments are heeded.
      return thisInterpreter.createPrimitive(Date());
    }
    if (!arguments.length) {
      newDate.data = new Date();
    } else if (arguments.length == 1 && (value.type == 'string' ||
        thisInterpreter.isa(value, thisInterpreter.STRING))) {
      newDate.data = new Date(value.toString());
    } else {
      var args = [null];
      for (var i = 0; i < arguments.length; i++) {
        args[i + 1] = arguments[i] ? arguments[i].toNumber() : undefined;
      }
      newDate.data = new (Function.prototype.bind.apply(Date, args));
    }
    return newDate;
  };
  this.DATE = this.createNativeFunction(wrapper, true);
  this.setProperty(scope, 'Date', this.DATE);

  // Static methods on Date.
  wrapper = function() {
    return thisInterpreter.createPrimitive(new Date().getTime());
  };
  this.setProperty(this.DATE, 'now', this.createNativeFunction(wrapper, false),
      Interpreter.NONENUMERABLE_DESCRIPTOR);

  wrapper = function(dateString) {
    dateString = dateString ? dateString.toString() : undefined;
    return thisInterpreter.createPrimitive(Date.parse(dateString));
  };
  this.setProperty(this.DATE, 'parse', this.createNativeFunction(wrapper, false),
                   Interpreter.NONENUMERABLE_DESCRIPTOR);

  wrapper = function(var_args) {
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args[i] = arguments[i] ? arguments[i].toNumber() : undefined;
    }
    return thisInterpreter.createPrimitive(Date.UTC.apply(Date, args));
  };
  this.setProperty(this.DATE, 'UTC', this.createNativeFunction(wrapper, false),
      Interpreter.NONENUMERABLE_DESCRIPTOR);

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
        this.createNativeFunction(wrapper, false),
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
  // RegExp constructor.
  wrapper = function(pattern, flags) {
    if (thisInterpreter.calledWithNew()) {
      // Called as new RegExp().
      var rgx = this;
    } else {
      // Called as RegExp().
      var rgx = thisInterpreter.createObject(thisInterpreter.REGEXP);
    }
    pattern = pattern ? pattern.toString() : '';
    flags = flags ? flags.toString() : '';
    return thisInterpreter.populateRegExp_(rgx, new RegExp(pattern, flags));
  };
  this.REGEXP = this.createNativeFunction(wrapper, true);
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
    try {
      var nativeObj = JSON.parse(text.toString());
    } catch (e) {
      thisInterpreter.throwException(thisInterpreter.SYNTAX_ERROR, e.message);
      return;
    }
    return thisInterpreter.nativeToPseudo(nativeObj);
  };
  this.setProperty(myJSON, 'parse', this.createNativeFunction(wrapper, false));

  wrapper = function(value) {
    var nativeObj = thisInterpreter.pseudoToNative(value);
    return thisInterpreter.createPrimitive(JSON.stringify(nativeObj));
  };
  this.setProperty(myJSON, 'stringify',
      this.createNativeFunction(wrapper, false));
};

/**
 * Initialize the Error class.
 * @param {!Interpreter.Object} scope Global scope.
 */
Interpreter.prototype.initError = function(scope) {
  var thisInterpreter = this;
  // Error constructor.
  this.ERROR = this.createNativeFunction(function(opt_message) {
    if (thisInterpreter.calledWithNew()) {
      // Called as new Error().
      var newError = this;
    } else {
      // Called as Error().
      var newError = thisInterpreter.createObject(thisInterpreter.ERROR);
    }
    if (opt_message) {
      thisInterpreter.setProperty(newError, 'message',
          thisInterpreter.createPrimitive(String(opt_message)),
          Interpreter.NONENUMERABLE_DESCRIPTOR);
    }
    return newError;
  }, true);
  this.setProperty(scope, 'Error', this.ERROR);
  this.setProperty(this.ERROR.properties.prototype, 'message',
      this.STRING_EMPTY, Interpreter.NONENUMERABLE_DESCRIPTOR);
  this.setProperty(this.ERROR.properties.prototype, 'name',
      this.createPrimitive('Error'), Interpreter.NONENUMERABLE_DESCRIPTOR);

  var createErrorSubclass = function(name) {
    var constructor = thisInterpreter.createNativeFunction(
        function(opt_message) {
          if (thisInterpreter.calledWithNew()) {
            // Called as new XyzError().
            var newError = this;
          } else {
            // Called as XyzError().
            var newError = thisInterpreter.createObject(constructor);
          }
          if (opt_message) {
            thisInterpreter.setProperty(newError, 'message',
                thisInterpreter.createPrimitive(String(opt_message)),
                Interpreter.NONENUMERABLE_DESCRIPTOR);
          }
          return newError;
        }, true);
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
 * @param {Object} constructor Constructor of object.
 * @return {boolean} True if object is the class or inherits from it.
 *     False otherwise.
 */
Interpreter.prototype.isa = function(child, constructor) {
  if (!child || !constructor) {
    return false;
  }
  while (child.properties.constructor != constructor) {
    if (!child.properties.constructor || !child.proto) {
      return false;
    }
    child = child.proto;
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
  if (a.isPrimitive && typeof a.data == 'number' && isNaN(a.data) ||
      b.isPrimitive && typeof b.data == 'number' && isNaN(b.data)) {
    // NaN is not comparable to anything, including itself.
    return NaN;
  }
  if (a === b) {
    return 0;
  }
  var aValue =
        a.isPrimitive ? a.data : a.toString();
  var bValue =
        b.isPrimitive ? b.data : b.toString();
  if (aValue < bValue) {
    return -1;
  } else if (aValue > bValue) {
    return 1;
  } else if (!a.isPrimitive && !b.isPrimitive) {
    // Two objects that have equal values are still not equal.
    // e.g. [1, 2] != [1, 2]
    return NaN;
  } else if (aValue == bValue) {
    return 0;
  }
  return NaN;
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
    this.proto = interpreter.NUMBER.properties.prototype;
  } else if (type == 'string') {
    this.proto = interpreter.STRING.properties.prototype;
  } else if (type == 'boolean') {
    this.proto = interpreter.BOOLEAN.properties.prototype;
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
 * @type {Interpreter.Object}
 */
Interpreter.Primitive.prototype.proto = null;

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
 * @param {Interpreter.Object} parent Parent constructor function or null.
 * @constructor
 */
Interpreter.Object = function(parent) {
  this.notConfigurable = Object.create(null);
  this.notEnumerable = Object.create(null);
  this.notWritable = Object.create(null);
  this.getter = Object.create(null);
  this.setter = Object.create(null);
  this.properties = Object.create(null);
  this.proto = parent && parent.properties.prototype;
};

/**
 * @type {string}
 */
Interpreter.Object.prototype.type = 'object';

/**
 * @type {Interpreter.Object}
 */
Interpreter.Object.prototype.proto = null;

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
 * @param {Interpreter.Object} constructor Parent constructor function,
 *     or null if scope object.
 * @return {!Interpreter.Object} New data object.
 */
Interpreter.prototype.createObject = function(constructor) {
  var obj = new Interpreter.Object(constructor);
  if (constructor) {
    this.setProperty(obj, 'constructor', constructor,
        Interpreter.NONENUMERABLE_DESCRIPTOR);
  }
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
  // Errors have a custom toString method.
  if (this.isa(obj, this.ERROR)) {
    var thisInterpreter = this;
    obj.toString = function() {
      var name = thisInterpreter.getProperty(this, 'name').toString();
      var message = thisInterpreter.getProperty(this, 'message').toString();
      return message ? name + ': ' + message : name;
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
 * @param {!Object} node AST node defining the function.
 * @param {!Object} scope Parent scope.
 * @return {!Interpreter.Object} New function.
 */
Interpreter.prototype.createFunction = function(node, scope) {
  var func = this.createObject(this.FUNCTION);
  func.parentScope = scope;
  func.node = node;
  this.setProperty(func, 'length',
      this.createPrimitive(func.node.params.length),
      Interpreter.READONLY_DESCRIPTOR);
  return func;
};

/**
 * Create a new native function.
 * @param {!Function} nativeFunc JavaScript function.
 * @param {boolean=} opt_constructor If true, the function's
 * prototype will have its constructor property set to the function.
 * If false, the function cannot be called as a constructor (e.g. escape).
 * Defaults to undefined.
 * @return {!Interpreter.Object} New function.
 */
Interpreter.prototype.createNativeFunction =
    function(nativeFunc, opt_constructor) {
  var func = this.createObject(this.FUNCTION);
  func.nativeFunc = nativeFunc;
  this.setProperty(func, 'length', this.createPrimitive(nativeFunc.length),
      Interpreter.READONLY_DESCRIPTOR);
  if (opt_constructor) {
    this.setProperty(func.properties.prototype, 'constructor',
        func, Interpreter.NONENUMERABLE_DESCRIPTOR);
  } else if (opt_constructor === false) {
    func.illegalConstructor = true;
    this.setProperty(func, 'prototype', this.UNDEFINED);
  }
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

  if (nativeObj instanceof Function) {
    var interpreter = this;
    var wrapper = function() {
      return interpreter.nativeToPseudo(
        nativeObj.apply(interpreter,
          Array.prototype.slice.call(arguments)
          .map(function(i) {
            return interpreter.pseudoToNative(i);
          })
        )
      );
    };
    return this.createNativeFunction(wrapper, undefined);
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
 * @return {!Interpreter.Object|!Interpreter.Primitive|null} Property value
 *     (may be UNDEFINED), or null if an error was thrown and will be caught.
 */
Interpreter.prototype.getProperty = function(obj, name) {
  name = name.toString();
  if (obj == this.UNDEFINED || obj == this.NULL) {
    this.throwException(this.TYPE_ERROR,
                        "Cannot read property '" + name + "' of " + obj);
    return null;
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
    if (obj.proto && obj != obj.proto) {
      obj = obj.proto;
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
    if (obj.proto && obj != obj.proto) {
      obj = obj.proto;
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
  var strict = !this.stateStack || this.getScope().strict;
  if (obj.isPrimitive) {
    if (strict) {
      this.throwException(this.TYPE_ERROR, 'Can\'t create property \'' + name +
                          '\' on \'' + obj.data + '\'');
    }
    return;
  }
  if (this.isa(obj, this.STRING)) {
    var n = this.arrayIndex(name);
    if (name == 'length' || (!isNaN(n) && n < obj.data.length)) {
      // Can't set length or letters on String objects.
      if (strict) {
        this.throwException(this.TYPE_ERROR, 'Cannot assign to read only ' +
            'property \'' + name + '\' of String \'' + obj.data + '\'');
      }
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
    if (strict) {
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
    // Determine if there is a setter anywhere in the parent chain.
    var parent = obj;
    while (true) {
      if (parent.setter && parent.setter[name]) {
        return parent.setter[name];
      }
      if (parent.proto && parent != parent.proto) {
        parent = parent.proto;
      } else {
        // No prototype, reached the top.
        break;
      }
    }
    if (obj.getter && obj.getter[name]) {
      if (strict) {
        this.throwException(this.TYPE_ERROR, 'Cannot set property \'' + name +
            '\' of object \'' + obj + '\' which only has a getter');
      }
    } else {
      // No setter, simple assignment.
      if (!obj.notWritable[name]) {
        obj.properties[name] = value;
      } else if (strict) {
        this.throwException(this.TYPE_ERROR, 'Cannot assign to read only ' +
            'property \'' + name + '\' of object \'' + obj + '\'');
      }
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
      this.createNativeFunction(wrapper, false),
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
  for (var i = this.stateStack.length - 1; i >= 0; i--) {
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
 * @return {!Interpreter.Object|!Interpreter.Primitive|null} The value
 *     or null if an error was thrown and will be caught.
 */
Interpreter.prototype.getValueFromScope = function(name) {
  var scope = this.getScope();
  var nameStr = name.toString();
  while (scope && scope != this.global) {
    if (nameStr in scope.properties) {
      return scope.properties[nameStr];
    }
    scope = scope.parentScope;
  }
  // The root scope is also an object which has inherited properties and
  // could also have getters.
  if (scope == this.global && this.hasProperty(scope, nameStr)) {
    return this.getProperty(scope, nameStr);
  }
  // Typeof operator is unique: it can safely look at non-defined variables.
  var prevNode = this.stateStack[this.stateStack.length - 1].node;
  if (prevNode.type == 'UnaryExpression' && prevNode.operator == 'typeof') {
    return this.UNDEFINED;
  }
  this.throwException(this.REFERENCE_ERROR, nameStr + ' is not defined');
  return null;
};

/**
 * Sets a value to the current scope.
 * @param {!Interpreter.Object|!Interpreter.Primitive} name Name of variable.
 * @param {!Interpreter.Object|!Interpreter.Primitive} value Value.
 * @return {!Interpreter.Object|undefined} Returns a setter function if one
 *     needs to be called, otherwise undefined.
 */
Interpreter.prototype.setValueToScope = function(name, value) {
  var scope = this.getScope();
  var nameStr = name.toString();
  while (scope && scope != this.global) {
    if (nameStr in scope.properties) {
      scope.properties[nameStr] = value;
      return undefined;
    }
    scope = scope.parentScope;
  }
  // The root scope is also an object which has readonly properties and
  // could also have setters.
  if (scope == this.global &&
      (!scope.strict || this.hasProperty(scope, nameStr))) {
    return this.setProperty(scope, nameStr, value);
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
  } else if (node.type == 'ExpressionStatement') {
    return;  // Expressions can't contain variable/function declarations.
  }
  var nodeClass = node.constructor;
  for (var name in node) {
    var prop = node[name];
    if (prop && typeof prop == 'object') {
      if (prop instanceof Array) {
        for (var i = 0; i < prop.length; i++) {
          if (prop[i] && prop[i].constructor == nodeClass) {
            this.populateScope_(prop[i], scope);
          }
        }
      } else {
        if (prop.constructor == nodeClass) {
          this.populateScope_(prop, scope);
        }
      }
    }
  }
};

/**
 * Remove start and end values from AST, or set start and end values to a
 * constant value.  Used to remove highlighting from polyfills and to set
 * highlighting in an eval to cover the entire eval expression.
 * @param {!Object} node AST node.
 * @param {number=} start Starting character of all nodes, or undefined.
 * @param {number=} end Ending character of all nodes, or undefined.
 * @private
 */
Interpreter.prototype.stripLocations_ = function(node, start, end) {
  if (start) {
    node.start = start;
  } else {
    delete node.start;
  }
  if (end) {
    node.end = end;
  } else {
    delete node.end;
  }
  for (var name in node) {
    if (node.hasOwnProperty(name)) {
      var prop = node[name];
      if (prop && typeof prop == 'object') {
        this.stripLocations_(prop, start, end);
      }
    }
  }
};

/**
 * Is the current state directly being called with as a construction with 'new'.
 * @return {boolean} True if 'new foo()', false if 'foo()'.
 */
Interpreter.prototype.calledWithNew = function() {
  return this.stateStack[this.stateStack.length - 1].isConstructor;
};

/**
 * Gets a value from the scope chain or from an object property.
 * @param {!Interpreter.Object|!Interpreter.Primitive|!Array} left
 *     Name of variable or object/propname tuple.
 * @return {!Interpreter.Object|!Interpreter.Primitive|null} Value
 *     or null if an error was thrown and will be caught.
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
    return this.setValueToScope(left, value);
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
  if (opt_message === undefined) {
    var error = errorClass;  // This is a value to throw, not an error class.
  } else {
    var error = this.createObject(errorClass);
    this.setProperty(error, 'message', this.createPrimitive(opt_message),
        Interpreter.NONENUMERABLE_DESCRIPTOR);
  }
  this.executeException(error);
};

/**
 * Throw an exception in the interpreter that can be handled by a
 * interpreter try/catch statement.  If unhandled, a real exception will
 * be thrown.
 * @param {!Interpreter.Object} error Error object to execute.
 */
Interpreter.prototype.executeException = function(error) {
  // Search for a try statement.
  do {
    this.stateStack.pop();
    var state = this.stateStack[this.stateStack.length - 1];
    if (state.node.type == 'TryStatement') {
      state.throwValue = error;
      return;
    }
  } while (state && state.node.type != 'Program');

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
    var name = this.getProperty(error, 'name').toString();
    var message = this.getProperty(error, 'message').valueOf();
    var type = errorTable[name] || Error;
    realError = type(message);
  } else {
    realError = error.toString();
  }
  throw realError;
};

/**
 * Push a call to a getter onto the statestack.
 * @param {!Interpreter.Object} func Function to execute.
 * @param {!Interpreter.Object|!Array} left
 *     Name of variable or object/propname tuple.
 * @private
 */
Interpreter.prototype.pushGetter_ = function(func, left) {
  // Normally 'this' will be specified as the object component (o.x).
  // Sometimes 'this' is explicitly provided (o).
  var funcThis = (left instanceof Array) ? left[0] : left;
  this.stateStack.push({
    node: {type: 'CallExpression'},
    doneCallee_: true,
    funcThis_: funcThis,
    func_: func,
    doneArgs_: true,
    arguments_: []
  });
};

/**
 * Push a call to a setter onto the statestack.
 * @param {!Interpreter.Object} func Function to execute.
 * @param {!Interpreter.Object|!Array} left
 *     Name of variable or object/propname tuple.
 * @param {!Interpreter.Object|Interpreter.Primitive} value Value to set.
 * @private
 */
Interpreter.prototype.pushSetter_ = function(func, left, value) {
  // Normally 'this' will be specified as the object component (o.x).
  // Sometimes 'this' is implicitly the global object (x).
  var funcThis = (left instanceof Array) ? left[0] : this.global;
  this.stateStack.push({
    node: {type: 'CallExpression'},
    doneCallee_: true,
    funcThis_: funcThis,
    func_: func,
    doneArgs_: true,
    arguments_: [value]
  });
};

///////////////////////////////////////////////////////////////////////////////
// Functions to handle each node type.
///////////////////////////////////////////////////////////////////////////////

Interpreter.prototype['stepArrayExpression'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  var n = state.n_ || 0;
  if (!state.array_) {
    state.array_ = this.createObject(this.ARRAY);
  } else if (state.value) {
    this.setProperty(state.array_, n - 1, state.value);
  }
  if (n < node.elements.length) {
    state.n_ = n + 1;
    if (node.elements[n]) {
      this.stateStack.push({node: node.elements[n]});
    } else {
      // [0, 1, , 3][2] -> undefined
      // Missing elements are not defined, they aren't undefined.
      state.value = undefined;
    }
  } else {
    state.array_.length = state.n_ || 0;
    this.stateStack.pop();
    this.stateStack[this.stateStack.length - 1].value = state.array_;
  }
};

Interpreter.prototype['stepAssignmentExpression'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  if (!state.doneLeft_) {
    state.doneLeft_ = true;
    this.stateStack.push({node: node.left, components: true});
    return;
  }
  if (!state.doneRight_) {
    if (!state.leftSide_) {
      state.leftSide_ = state.value;
    }
    if (state.doneGetter_) {
      state.leftValue_ = state.value;
    }
    if (!state.doneGetter_ && node.operator != '=') {
      state.leftValue_ = this.getValue(state.leftSide_);
      if (state.leftValue_.isGetter) {
        // Clear the getter flag and call the getter function.
        state.leftValue_.isGetter = false;
        state.doneGetter_ = true;
        var func = /** @type {!Interpreter.Object} */ (state.leftValue_);
        this.pushGetter_(func, state.leftSide_);
        return;
      }
    }
    state.doneRight_ = true;
    this.stateStack.push({node: node.right});
    return;
  }
  if (state.doneSetter_) {
    // Return if setter function.
    // Setter method on property has completed.
    // Ignore its return value, and use the original set value instead.
    this.stateStack.pop();
    this.stateStack[this.stateStack.length - 1].value = state.doneSetter_;
    return;
  }
  var rightSide = state.value;
  var value;
  if (node.operator == '=') {
    value = rightSide;
  } else {
    var rightValue = rightSide;
    var leftNumber = state.leftValue_.toNumber();
    var rightNumber = rightValue.toNumber();
    if (node.operator == '+=') {
      var left, right;
      if (state.leftValue_.type == 'string' || rightValue.type == 'string') {
        left = state.leftValue_.toString();
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
  var setter = this.setValue(state.leftSide_, value);
  if (setter) {
    state.doneSetter_ = value;
    this.pushSetter_(setter, state.leftSide_, value);
    return;
  }
  // Return if no setter function.
  this.stateStack.pop();
  this.stateStack[this.stateStack.length - 1].value = value;
};

Interpreter.prototype['stepBinaryExpression'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  if (!state.doneLeft_) {
    state.doneLeft_ = true;
    this.stateStack.push({node: node.left});
    return;
  }
  if (!state.doneRight_) {
    state.doneRight_ = true;
    state.leftValue_ = state.value;
    this.stateStack.push({node: node.right});
    return;
  }
  this.stateStack.pop();
  var leftSide = state.leftValue_;
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
    var leftValue =
        leftSide.isPrimitive ? leftSide.data : leftSide.toString();
    var rightValue =
        rightSide.isPrimitive ? rightSide.data : rightSide.toString();
    value = leftValue + rightValue;
  } else if (node.operator == 'in') {
    value = this.hasProperty(rightSide, leftSide);
  } else if (node.operator == 'instanceof') {
    if (!this.isa(rightSide, this.FUNCTION)) {
      this.throwException(this.TYPE_ERROR,
          'Expecting a function in instanceof check');
    } else if (leftSide.isPrimitive) {
      value = this.FALSE;
    } else {
      value = this.isa(leftSide, rightSide);
    }
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
  this.stateStack[this.stateStack.length - 1].value =
      this.createPrimitive(value);
};

Interpreter.prototype['stepBlockStatement'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  var n = state.n_ || 0;
  if (node.body[n]) {
    state.n_ = n + 1;
    this.stateStack.push({node: node.body[n]});
  } else {
    this.stateStack.pop();
  }
};

Interpreter.prototype['stepBreakStatement'] = function() {
  var state = this.stateStack.pop();
  var label = null;
  if (state.node.label) {
    label = state.node.label.name;
  }
  while (state &&
         state.node.type != 'CallExpression' &&
         state.node.type != 'NewExpression') {
    if (label) {
      if (state.labels && state.labels.indexOf(label) != -1) {
        return;
      }
    } else if (state.isLoop || state.isSwitch) {
      return;
    }
    state = this.stateStack.pop();
  }
  // Syntax error, do not allow this error to be trapped.
  throw SyntaxError('Illegal break statement');
};

Interpreter.prototype['stepCallExpression'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  if (!state.doneCallee_) {
    state.doneCallee_ = true;
    this.stateStack.push({node: node.callee, components: true});
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
      if (!state.func_) {
        return;  // Thrown error, but trapped.
      } else if (state.func_.type != 'function') {
        this.throwException(this.TYPE_ERROR,
            (state.func_ && state.func_.type) + ' is not a function');
        return;
      }
    }
    // Determine value of 'this' in function.
    if (state.node.type == 'NewExpression') {
      if (state.func_.illegalConstructor) {
        // Illegal: new escape();
        this.throwException(this.TYPE_ERROR, 'function is not a constructor');
        return;
      }
      // Constructor, 'this' is new object.
      state.funcThis_ = this.createObject(state.func_);
      state.isConstructor = true;
    } else if (state.value.length) {
      // Method function, 'this' is object.
      state.funcThis_ = state.value[0];
    } else {
      // Global function, 'this' is global object (or 'undefined' if strict).
      state.funcThis_ = this.getScope().strict ?
          this.UNDEFINED : this.global;
    }
    state.arguments_ = [];
    state.n_ = 0;
  }
  if (!state.doneArgs_) {
    if (state.n_ != 0) {
      state.arguments_.push(state.value);
    }
    if (node.arguments[state.n_]) {
      this.stateStack.push({node: node.arguments[state.n_]});
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
        var paramValue = state.arguments_.length > i ? state.arguments_[i] :
            this.UNDEFINED;
        this.setProperty(scope, paramName, paramValue);
      }
      // Build arguments variable.
      var argsList = this.createObject(this.ARRAY);
      for (var i = 0; i < state.arguments_.length; i++) {
        this.setProperty(argsList, this.createPrimitive(i),
                         state.arguments_[i]);
      }
      this.setProperty(scope, 'arguments', argsList);
      var funcState = {
        node: state.func_.node.body,
        scope: scope,
        thisExpression: state.funcThis_
      };
      this.stateStack.push(funcState);
      state.value = this.UNDEFINED;  // Default value if no explicit return.
    } else if (state.func_.nativeFunc) {
      state.value =
          state.func_.nativeFunc.apply(state.funcThis_, state.arguments_);
    } else if (state.func_.asyncFunc) {
      var thisInterpreter = this;
      var callback = function(value) {
        state.value = value || thisInterpreter.UNDEFINED;
        thisInterpreter.paused_ = false;
      };
      var argsWithCallback = state.arguments_.concat(callback);
      state.func_.asyncFunc.apply(state.funcThis_, argsWithCallback);
      this.paused_ = true;
      return;
    } else if (state.func_.eval) {
      var code = state.arguments_[0];
      if (!code) {  // eval()
        state.value = this.UNDEFINED;
      } else if (!code.isPrimitive) {
        // JS does not parse String objects:
        // eval(new String('1 + 1')) -> '1 + 1'
        state.value = code;
      } else {
        var ast = acorn.parse(code.toString(), Interpreter.PARSE_OPTIONS);
        state = {
          node: {
            type: 'EvalProgram_',
            body: ast.body
          }
        };
        this.stripLocations_(state.node, node.start, node.end);
        // Update current scope with definitions in eval().
        var scope = this.getScope();
        this.populateScope_(ast, scope);
        this.stateStack.push(state);
      }
    } else {
      /* A child of a function is a function but is not callable.  For example:
      var F = function() {};
      F.prototype = escape;
      var f = new F();
      f();
      */
      this.throwException(this.TYPE_ERROR, 'function is not a function');
    }
  } else {
    // Execution complete.  Put the return value on the stack.
    this.stateStack.pop();
    if (state.isConstructor && state.value.type !== 'object') {
      this.stateStack[this.stateStack.length - 1].value = state.funcThis_;
    } else {
      this.stateStack[this.stateStack.length - 1].value = state.value;
    }
  }
};

Interpreter.prototype['stepCatchClause'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  if (!state.done_) {
    state.done_ = true;
    var scope;
    if (node.param) {
      scope = this.createSpecialScope(this.getScope());
      // Add the argument.
      var paramName = this.createPrimitive(node.param.name);
      this.setProperty(scope, paramName, state.throwValue);
    }
    this.stateStack.push({node: node.body, scope: scope});
  } else {
    this.stateStack.pop();
  }
};

Interpreter.prototype['stepConditionalExpression'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var mode = state.mode_ || 0;
  if (mode == 0) {
    state.mode_ = 1;
    this.stateStack.push({node: state.node.test});
    return;
  }
  if (mode == 1) {
    state.mode_ = 2;
    var value = state.value.toBoolean();
    if (value && state.node.consequent) {
      this.stateStack.push({node: state.node.consequent});
      return;  // Execute 'if' block.
    } else if (!value && state.node.alternate) {
      this.stateStack.push({node: state.node.alternate});
      return;  // Execute 'else' block.
    }
    // eval('1;if(false){2}') -> undefined
    this.value = this.UNDEFINED;
  }
  this.stateStack.pop();
  if (state.node.type == 'ConditionalExpression') {
    this.stateStack[this.stateStack.length - 1].value = state.value;
  }
};

Interpreter.prototype['stepContinueStatement'] = function() {
  var state = this.stateStack.pop();
  var label = null;
  if (state.node.label) {
    label = state.node.label.name;
  }
  state = this.stateStack[this.stateStack.length - 1];
  while (state &&
         state.node.type != 'CallExpression' &&
         state.node.type != 'NewExpression') {
    if (state.isLoop) {
      if (!label || (state.labels && state.labels.indexOf(label) != -1)) {
        return;
      }
    }
    this.stateStack.pop();
    state = this.stateStack[this.stateStack.length - 1];
  }
  // Syntax error, do not allow this error to be trapped.
  throw SyntaxError('Illegal continue statement');
};

Interpreter.prototype['stepDoWhileStatement'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  if (state.node.type == 'DoWhileStatement' && state.test_ === undefined) {
    // First iteration of do/while executes without checking test.
    state.value = this.TRUE;
    state.test_ = true;
  }
  if (!state.test_) {
    state.test_ = true;
    this.stateStack.push({node: state.node.test});
  } else {
    if (!state.value.toBoolean()) {  // Done, exit loop.
      this.stateStack.pop();
    } else if (state.node.body) {  // Execute the body.
      state.test_ = false;
      state.isLoop = true;
      this.stateStack.push({node: state.node.body});
    }
  }
};

Interpreter.prototype['stepEmptyStatement'] = function() {
  this.stateStack.pop();
};

Interpreter.prototype['stepEvalProgram_'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  var n = state.n_ || 0;
  if (node.body[n]) {
    state.n_ = n + 1;
    this.stateStack.push({node: node.body[n]});
  } else {
    this.stateStack.pop();
    this.stateStack[this.stateStack.length - 1].value = this.value;
  }
};

Interpreter.prototype['stepExpressionStatement'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  if (!state.done_) {
    state.done_ = true;
    this.stateStack.push({node: state.node.expression});
  } else {
    this.stateStack.pop();
    // Save this value to interpreter.value for use as a return value if
    // this code is inside an eval function.
    this.value = state.value;
  }
};

Interpreter.prototype['stepForInStatement'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  if (!state.doneVariable_) {
    state.doneVariable_ = true;
    var left = node.left;
    if (left.type == 'VariableDeclaration') {
      // Inline variable declaration: for (var x in y)
      left = left.declarations[0].id;
    }
    this.stateStack.push({node: left, components: true});
    return;
  }
  if (!state.doneObject_) {
    state.doneObject_ = true;
    state.variable_ = state.value;
    this.stateStack.push({node: node.right});
    return;
  }
  if (typeof state.iterator_ == 'undefined') {
    // First iteration.
    state.object_ = state.value;
    state.iterator_ = 0;
  }
  var name = null;
  done: do {
    var i = state.iterator_;
    if (state.object_.isPrimitive) {
      for (var prop in state.object_.data) {
        if (i == 0) {  // Found the i'th enumerable property.
          name = prop;
          break done;
        }
        i--;
      }
    } else {
      for (var prop in state.object_.properties) {
        if (state.object_.notEnumerable[prop]) {
          continue;
        }
        if (i == 0) {  // Found the i'th enumerable property.
          name = prop;
          break done;
        }
        i--;
      }
    }
    state.object_ = state.object_.prototype;
    state.iterator_ = 0;
  } while (state.object_);

  if (name === null) {  // Done, exit loop.
    this.stateStack.pop();
  } else {  // Execute the body.
    if (!state.doneSetter_) {
      var value = this.createPrimitive(name);
      var setter = this.setValue(state.variable_, value);
      if (setter) {
        state.doneSetter_ = true;
        this.pushSetter_(setter, state.variable_, value);
        return;
      }
    }
    state.doneSetter_ = false;
    if (node.body) {
      state.isLoop = true;
      this.stateStack.push({node: node.body});
    }
    state.iterator_++;
  }
};

Interpreter.prototype['stepForStatement'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  var mode = state.mode_ || 0;
  if (mode == 0) {
    state.mode_ = 1;
    if (node.init) {
      this.stateStack.push({node: node.init});
    }
  } else if (mode == 1) {
    state.mode_ = 2;
    if (node.test) {
      this.stateStack.push({node: node.test});
    }
  } else if (mode == 2) {
    state.mode_ = 3;
    if (node.test && state.value && !state.value.toBoolean()) {
      // Done, exit loop.
      this.stateStack.pop();
    } else if (node.body) { // Execute the body.
      state.isLoop = true;
      this.stateStack.push({node: node.body});
    }
  } else if (mode == 3) {
    state.mode_ = 1;
    if (node.update) {
      this.stateStack.push({node: node.update});
    }
  }
};

Interpreter.prototype['stepFunctionDeclaration'] = function() {
  // This was found and handled when the scope was populated.
  this.stateStack.pop();
};

Interpreter.prototype['stepFunctionExpression'] = function() {
  var state = this.stateStack.pop();
  this.stateStack[this.stateStack.length - 1].value =
      this.createFunction(state.node, this.getScope());
};

Interpreter.prototype['stepIdentifier'] = function() {
  var state = this.stateStack.pop();
  var nameStr = state.node.name;
  var name = this.createPrimitive(nameStr);
  var value = state.components ? name : this.getValueFromScope(name);
  // An identifier could be a getter if it's a property on the global object.
  if (value && value.isGetter) {
    // Clear the getter flag and call the getter function.
    value.isGetter = false;
    var scope = this.getScope();
    while (!this.hasProperty(scope, nameStr)) {
      scope = scope.parentScope;
    }
    var func = /** @type {!Interpreter.Object} */ (value);
    this.pushGetter_(func, this.global);
  } else {
    this.stateStack[this.stateStack.length - 1].value = value;
  }
};

Interpreter.prototype['stepIfStatement'] =
    Interpreter.prototype['stepConditionalExpression'];

Interpreter.prototype['stepLabeledStatement'] = function() {
  // No need to hit this node again on the way back up the stack.
  var state = this.stateStack.pop();
  // Note that a statement might have multiple labels,
  var labels = state.labels || [];
  labels.push(state.node.label.name);
  this.stateStack.push({node: state.node.body,
                        labels: labels});
};

Interpreter.prototype['stepLiteral'] = function() {
  var state = this.stateStack.pop();
  this.stateStack[this.stateStack.length - 1].value =
      this.createPrimitive(state.node.value);
};

Interpreter.prototype['stepLogicalExpression'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  if (node.operator != '&&' && node.operator != '||') {
    throw SyntaxError('Unknown logical operator: ' + node.operator);
  }
  if (!state.doneLeft_) {
    state.doneLeft_ = true;
    this.stateStack.push({node: node.left});
  } else if (!state.doneRight_) {
    if ((node.operator == '&&' && !state.value.toBoolean()) ||
        (node.operator == '||' && state.value.toBoolean())) {
      // Shortcut evaluation.
      this.stateStack.pop();
      this.stateStack[this.stateStack.length - 1].value = state.value;
    } else {
      state.doneRight_ = true;
      this.stateStack.push({node: node.right});
    }
  } else {
    this.stateStack.pop();
    this.stateStack[this.stateStack.length - 1].value = state.value;
  }
};

Interpreter.prototype['stepMemberExpression'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  if (!state.doneObject_) {
    state.doneObject_ = true;
    this.stateStack.push({node: node.object});
  } else if (!state.doneProperty_) {
    state.doneProperty_ = true;
    state.object_ = state.value;
    this.stateStack.push({
      node: node.property,
      components: !node.computed
    });
  } else {
    this.stateStack.pop();
    if (state.components) {
      this.stateStack[this.stateStack.length - 1].value =
          [state.object_, state.value];
    } else {
      var value = this.getProperty(state.object_, state.value);
      if (!value) {
        this.stateStack.push({});
        this.throwException(this.TYPE_ERROR,
            "Cannot read property '" + state.value + "' of " +
            state.object_.toString());
        return;
      }
      if (value.isGetter) {
        // Clear the getter flag and call the getter function.
        value.isGetter = false;
        var func = /** @type {!Interpreter.Object} */ (value);
        this.pushGetter_(func, state.object_);
      } else {
        this.stateStack[this.stateStack.length - 1].value = value;
      }
    }
  }
};

Interpreter.prototype['stepNewExpression'] =
    Interpreter.prototype['stepCallExpression'];

Interpreter.prototype['stepObjectExpression'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  var valueToggle = state.valueToggle_;
  var n = state.n_ || 0;
  if (!state.object) {
    state.object = this.createObject(this.OBJECT);
    state.properties = Object.create(null);
  } else {
    if (valueToggle) {
      state.key_ = state.value;
    } else {
      if (!state.properties[state.key_]) {
        // Create temp object to collect value, getter, and/or setter.
        state.properties[state.key_] = {};
      }
      state.properties[state.key_][state.kind_] = state.value;
    }
  }
  if (node.properties[n]) {
    if (valueToggle) {
      state.n_ = n + 1;
      this.stateStack.push({node: node.properties[n].value});
    } else {
      state.kind_ = node.properties[n].kind;
      this.stateStack.push({node: node.properties[n].key, components: true});
    }
    state.valueToggle_ = !valueToggle;
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
    this.stateStack.pop();
    this.stateStack[this.stateStack.length - 1].value = state.object;
  }
};

Interpreter.prototype['stepProgram'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  var n = state.n_ || 0;
  if (node.body[n]) {
    state.done = false;
    state.n_ = n + 1;
    this.stateStack.push({node: node.body[n]});
  } else {
    state.done = true;
    // Don't pop the stateStack.
    // Leave the root scope on the tree in case the program is appended to.
  }
};

Interpreter.prototype['stepReturnStatement'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  if (node.argument && !state.done_) {
    state.done_ = true;
    this.stateStack.push({node: node.argument});
  } else {
    var value = state.value || this.UNDEFINED;
    var i = this.stateStack.length - 1;
    state = this.stateStack[i];
    while (state.node.type != 'CallExpression' &&
           state.node.type != 'NewExpression') {
      if (state.node.type != 'TryStatement') {
        this.stateStack.splice(i, 1);
      }
      i--;
      if (i < 0) {
        // Syntax error, do not allow this error to be trapped.
        throw SyntaxError('Illegal return statement');
      }
      state = this.stateStack[i];
    }
    state.value = value;
  }
};

Interpreter.prototype['stepSequenceExpression'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  var n = state.n_ || 0;
  if (node.expressions[n]) {
    state.n_ = n + 1;
    this.stateStack.push({node: node.expressions[n]});
  } else {
    this.stateStack.pop();
    this.stateStack[this.stateStack.length - 1].value = state.value;
  }
};

Interpreter.prototype['stepSwitchStatement'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];

  if (!state.test_) {
    state.test_ = true;
    this.stateStack.push({node: state.node.discriminant});
    return;
  }
  if (!state.switchValue_) {
    // Preserve switch value between case tests.
    state.switchValue_ = state.value;
    state.checked_ = [];
  }

  var index = state.index_ || 0;
  var switchCase = state.node.cases[index];
  if (switchCase) {
    if (!state.done_ && !state.checked_[index] && switchCase.test) {
      state.checked_[index] = true;
      this.stateStack.push({node: switchCase.test});
      return;
    }
    // Test on the default case will be null.
    if (state.done_ || !switchCase.test ||
        this.comp(state.value, state.switchValue_) == 0) {
      state.done_ = true;
      var n = state.n_ || 0;
      if (switchCase.consequent[n]) {
        state.isSwitch = true;
        this.stateStack.push({node: switchCase.consequent[n]});
        state.n_ = n + 1;
        return;
      }
    }
    state.n_ = 0;
    state.index_ = index + 1;
  } else {
    this.stateStack.pop();
  }
};

Interpreter.prototype['stepThisExpression'] = function() {
  this.stateStack.pop();
  for (var i = this.stateStack.length - 1; i >= 0; i--) {
    if (this.stateStack[i].thisExpression) {
      this.stateStack[this.stateStack.length - 1].value =
          this.stateStack[i].thisExpression;
      return;
    }
  }
  throw Error('No this expression found.');
};

Interpreter.prototype['stepThrowStatement'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  if (!state.done_) {
    state.done_ = true;
    this.stateStack.push({node: node.argument});
  } else {
    this.throwException(state.value);
  }
};

Interpreter.prototype['stepTryStatement'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  if (!state.doneBlock_) {
    state.doneBlock_ = true;
    this.stateStack.push({node: node.block});
  } else if (state.throwValue && !state.doneHandler_ && node.handler) {
    state.doneHandler_ = true;
    this.stateStack.push({node: node.handler, throwValue: state.throwValue});
    state.throwValue = null;  // This error has been handled, don't rethrow.
  } else if (!state.doneFinalizer_ && node.finalizer) {
    state.doneFinalizer_ = true;
    this.stateStack.push({node: node.finalizer});
  } else if (state.throwValue) {
    // There was no catch handler, or the catch/finally threw an error.
    // Throw the error up to a higher try.
    this.executeException(state.throwValue);
  } else {
    this.stateStack.pop();
  }
};

Interpreter.prototype['stepUnaryExpression'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  if (!state.done_) {
    state.done_ = true;
    var nextState = {
      node: node.argument,
      components: node.operator == 'delete'
    };
    this.stateStack.push(nextState);
    return;
  }
  this.stateStack.pop();
  var value = state.value;
  if (node.operator == '-') {
    value = -value.toNumber();
  } else if (node.operator == '+') {
    value = value.toNumber();
  } else if (node.operator == '!') {
    value = !value.toBoolean();
  } else if (node.operator == '~') {
    value = ~value.toNumber();
  } else if (node.operator == 'delete') {
    if (value.length) {
      var obj = value[0];
      var name = value[1];
    } else {
      var obj = this.getScope();
      var name = value;
    }
    value = this.deleteProperty(obj, name);
    if (!value && this.getScope().strict) {
      this.throwException(this.TYPE_ERROR, 'Cannot delete property \'' +
                          name + '\' of \'' + obj + '\'');
      return;
    }
  } else if (node.operator == 'typeof') {
    value = value.type;
  } else if (node.operator == 'void') {
    value = undefined;
  } else {
    throw SyntaxError('Unknown unary operator: ' + node.operator);
  }
  this.stateStack[this.stateStack.length - 1].value =
      this.createPrimitive(value);
};

Interpreter.prototype['stepUpdateExpression'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  if (!state.doneLeft_) {
    state.doneLeft_ = true;
    this.stateStack.push({node: node.argument, components: true});
    return;
  }
  if (!state.leftSide_) {
    state.leftSide_ = state.value;
  }
  if (state.doneGetter_) {
    state.leftValue_ = state.value;
  }
  if (!state.doneGetter_) {
    state.leftValue_ = this.getValue(state.leftSide_);
    if (!state.leftValue_) {
      return;  // Thrown error, but trapped.
    }
    if (state.leftValue_.isGetter) {
      // Clear the getter flag and call the getter function.
      state.leftValue_.isGetter = false;
      state.doneGetter_ = true;
      var func = /** @type {!Interpreter.Object} */ (state.leftValue_);
      this.pushGetter_(func, state.leftSide_);
      return;
    }
  }
  if (state.doneSetter_) {
    // Return if setter function.
    // Setter method on property has completed.
    // Ignore its return value, and use the original set value instead.
    this.stateStack.pop();
    this.stateStack[this.stateStack.length - 1].value = state.doneSetter_;
    return;
  }
  var leftValue = state.leftValue_.toNumber();
  var changeValue;
  if (node.operator == '++') {
    changeValue = this.createPrimitive(leftValue + 1);
  } else if (node.operator == '--') {
    changeValue = this.createPrimitive(leftValue - 1);
  } else {
    throw SyntaxError('Unknown update expression: ' + node.operator);
  }
  var returnValue = node.prefix ? changeValue : this.createPrimitive(leftValue);
  var setter = this.setValue(state.leftSide_, changeValue);
  if (setter) {
    state.doneSetter_ = returnValue;
    this.pushSetter_(setter, state.leftSide_, changeValue);
    return;
  }
  // Return if no setter function.
  this.stateStack.pop();
  this.stateStack[this.stateStack.length - 1].value = returnValue;
};

Interpreter.prototype['stepVariableDeclaration'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  var n = state.n_ || 0;
  var declarationNode = node.declarations[n];
  if (state.value && declarationNode) {
    // This setValue call never needs to deal with calling a setter function.
    this.setValue(this.createPrimitive(declarationNode.id.name), state.value);
    state.value = null;
    declarationNode = node.declarations[++n];
  }
  while (declarationNode) {
    // Skip any declarations that are not initialized.  They have already
    // been defined as undefined in populateScope_.
    if (declarationNode.init) {
      state.n_ = n;
      this.stateStack.push({node: declarationNode.init});
      return;
    }
    declarationNode = node.declarations[++n];
  }
  this.stateStack.pop();
};

Interpreter.prototype['stepWithStatement'] = function() {
  var state = this.stateStack[this.stateStack.length - 1];
  var node = state.node;
  if (!state.doneObject_) {
    state.doneObject_ = true;
    this.stateStack.push({node: node.object});
  } else if (!state.doneBody_) {
    state.doneBody_ = true;
    var scope = this.createSpecialScope(this.getScope(), state.value);
    this.stateStack.push({node: node.body, scope: scope});
  } else {
    this.stateStack.pop();
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
