/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1,eval)("this");
} catch(e) {
	// This works if the window reference is available
	if(typeof window === "object")
		g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/// <reference types="node" />
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__(2)], __WEBPACK_AMD_DEFINE_RESULT__ = function (require, exports, i) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    (this.self || global)["Interpreter"] = i;
}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0)))

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/// <reference path="./_estree.d.ts" />
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = function (require, exports) {
    "use strict";
    // Import acorn if not found
    if (typeof acorn === 'undefined') {
        (this.self || global)['acorn'] = __webpack_require__(3);
    }
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
    /**
     * Create a new interpreter.
     * @param {string|!Object} code Raw JavaScript text or AST.
     * @param {Function=} opt_initFunc Optional initialization function.  Used to
     *     define APIs.  When called it is passed the interpreter object and the
     *     global scope object.
     * @constructor
     */
    var Interpreter = (function () {
        function Interpreter(code, opt_initFunc) {
            if (typeof code === 'string') {
                code = acorn.parse(code, Interpreter.PARSE_OPTIONS);
            }
            this.ast = code;
            this.initFunc_ = opt_initFunc;
            this.paused_ = false;
            this.polyfills_ = [];
            // Unique identifier for native functions.  Used in serialization.
            this.functionCounter_ = 0;
            // Map node types to our step function names; a property lookup is faster
            // than string concatenation with "step" prefix.
            this.stepFunctions_ = Object.create(null);
            var stepMatch = /^step([A-Z]\w*)$/;
            var m;
            for (var methodName in this) {
                if ((typeof this[methodName] === 'function') &&
                    (m = methodName.match(stepMatch))) {
                    this.stepFunctions_[m[1]] = this[methodName].bind(this);
                }
            }
            // Create and initialize the global scope.
            this.global = this.createScope(this.ast, null);
            // Run the polyfills.
            this.ast = acorn.parse(this.polyfills_.join('\n'), Interpreter.PARSE_OPTIONS);
            this.polyfills_ = undefined; // Allow polyfill strings to garbage collect.
            this.stripLocations_(this.ast, undefined, undefined);
            var state = new Interpreter.MyState(this.ast, this.global);
            state.done = false;
            this.stateStack = [state];
            this.run();
            this.value = undefined;
            // Point at the main program.
            this.ast = code;
            var state = new Interpreter.MyState(this.ast, this.global);
            state.done = false;
            this.stateStack.length = 0;
            this.stateStack[0] = state;
            // Get a handle on Acorn's node_t object.  It's tricky to access.
            this.nodeConstructor = state.node.constructor;
            // Preserve publicly properties from being pruned/renamed by JS compilers.
            // Add others as needed.
            this['stateStack'] = this.stateStack;
            this['OBJECT'] = this.OBJECT;
            this['OBJECT_PROTO'] = this.OBJECT_PROTO;
            this['FUNCTION'] = this.FUNCTION;
            this['FUNCTION_PROTO'] = this.FUNCTION_PROTO;
            this['ARRAY'] = this.ARRAY;
            this['ARRAY_PROTO'] = this.ARRAY_PROTO;
            this['REGEXP'] = this.REGEXP;
            this['REGEXP_PROTO'] = this.REGEXP_PROTO;
            // The following properties are obsolete.  Do not use.
            this['UNDEFINED'] = undefined;
            this['NULL'] = null;
            this['NAN'] = NaN;
            this['TRUE'] = true;
            this['FALSE'] = false;
            this['STRING_EMPTY'] = '';
            this['NUMBER_ZERO'] = 0;
            this['NUMBER_ONE'] = 1;
        }
        ;
        /**
         * Add more code to the interpreter.
         * @param {string|!Object} code Raw JavaScript text or AST.
         */
        Interpreter.prototype.appendCode = function (code) {
            var state = this.stateStack[0];
            if (!state || state.node['type'] !== 'Program') {
                throw Error('Expecting original AST to start with a Program node.');
            }
            if (typeof code === 'string') {
                code = acorn.parse(code, Interpreter.PARSE_OPTIONS);
            }
            if (!code || code['type'] !== 'Program') {
                throw Error('Expecting new AST to start with a Program node.');
            }
            this.populateScope_(code, state.scope);
            // Append the new program to the old one.
            for (var i = 0, node; (node = code['body'][i]); i++) {
                state.node['body'].push(node);
            }
            state.done = false;
        };
        ;
        /**
         * Execute one step of the interpreter.
         * @return {boolean} True if a step was executed, false if no more instructions.
         */
        Interpreter.prototype.step = function () {
            var stack = this.stateStack;
            var state = stack[stack.length - 1];
            if (!state) {
                return false;
            }
            var node = state.node, type = node['type'];
            if (type === 'Program' && state.done) {
                return false;
            }
            else if (this.paused_) {
                return true;
            }
            try {
                var nextState = this.stepFunctions_[type](stack, state, node);
            }
            catch (e) {
                // Eat any step errors.  They have been thrown on the stack.
                if (e !== Interpreter.STEP_ERROR) {
                    // Uh oh.  This is a real error in the JS-Interpreter.  Rethrow.
                    throw e;
                }
            }
            if (nextState) {
                stack.push(nextState);
            }
            if (!node['end']) {
                // This is polyfill code.  Keep executing until we arrive at user code.
                return this.step();
            }
            return true;
        };
        ;
        /**
         * Execute the interpreter to program completion.  Vulnerable to infinite loops.
         * @return {boolean} True if a execution is asynchronously blocked,
         *     false if no more instructions.
         */
        Interpreter.prototype.run = function () {
            while (!this.paused_ && this.step()) { }
            return this.paused_;
        };
        ;
        /**
         * Initialize the global scope with buitin properties and functions.
         * @param {!Interpreter.MyObject} scope Global scope.
         */
        Interpreter.prototype.initGlobalScope = function (scope) {
            // Initialize uneditable global properties.
            this.setProperty(scope, 'NaN', NaN, Interpreter.READONLY_DESCRIPTOR);
            this.setProperty(scope, 'Infinity', Infinity, Interpreter.READONLY_DESCRIPTOR);
            this.setProperty(scope, 'undefined', undefined, Interpreter.READONLY_DESCRIPTOR);
            this.setProperty(scope, 'window', scope, Interpreter.READONLY_DESCRIPTOR);
            this.setProperty(scope, 'this', scope, Interpreter.READONLY_DESCRIPTOR);
            this.setProperty(scope, 'self', scope); // Editable.
            // Create the objects which will become Object.prototype and
            // Function.prototype, which are needed to bootstrap everything else.
            this.OBJECT_PROTO = new Interpreter.MyObject(null);
            this.FUNCTION_PROTO = new Interpreter.MyObject(this.OBJECT_PROTO);
            // Initialize global objects.
            this.initFunction(scope);
            this.initObject(scope);
            // Unable to set scope's parent prior (OBJECT did not exist).
            // Note that in a browser this would be 'Window', whereas in Node.js it would
            // be 'Object'.  This interpreter is closer to Node in that it has no DOM.
            scope.proto = this.OBJECT_PROTO;
            this.setProperty(scope, 'constructor', this.OBJECT);
            this.initArray(scope);
            this.initString(scope);
            this.initBoolean(scope);
            this.initNumber(scope);
            this.initDate(scope);
            this.initRegExp(scope);
            this.initError(scope);
            this.initMath(scope);
            this.initJSON(scope);
            // Initialize global functions.
            var thisInterpreter = this;
            var func = this.createNativeFunction(function (x) { throw EvalError("Can't happen"); }, false);
            func.eval = true;
            this.setProperty(scope, 'eval', func);
            this.setProperty(scope, 'parseInt', this.createNativeFunction(parseInt, false));
            this.setProperty(scope, 'parseFloat', this.createNativeFunction(parseFloat, false));
            this.setProperty(scope, 'isNaN', this.createNativeFunction(isNaN, false));
            this.setProperty(scope, 'isFinite', this.createNativeFunction(isFinite, false));
            var strFunctions = [
                [escape, 'escape'], [unescape, 'unescape'],
                [decodeURI, 'decodeURI'], [decodeURIComponent, 'decodeURIComponent'],
                [encodeURI, 'encodeURI'], [encodeURIComponent, 'encodeURIComponent']
            ];
            for (var i = 0; i < strFunctions.length; i++) {
                var wrapper = (function (nativeFunc) {
                    return function (str) {
                        try {
                            return nativeFunc(str);
                        }
                        catch (e) {
                            // decodeURI('%xy') will throw an error.  Catch and rethrow.
                            thisInterpreter.throwException(thisInterpreter.URI_ERROR, e.message);
                        }
                    };
                })(strFunctions[i][0]);
                this.setProperty(scope, strFunctions[i][1], this.createNativeFunction(wrapper, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            }
            // Run any user-provided initialization.
            if (this.initFunc_) {
                this.initFunc_(this, scope);
            }
        };
        ;
        /**
         * Initialize the Function class.
         * @param {!Interpreter.MyObject} scope Global scope.
         */
        Interpreter.prototype.initFunction = function (scope) {
            var thisInterpreter = this;
            var wrapper;
            var identifierRegexp = /^[A-Za-z_$][\w$]*$/;
            // Function constructor.
            wrapper = function (var_args) {
                if (thisInterpreter.calledWithNew()) {
                    // Called as new Function().
                    var newFunc = this;
                }
                else {
                    // Called as Function().
                    var newFunc = thisInterpreter.createObjectProto(thisInterpreter.FUNCTION_PROTO);
                }
                if (arguments.length) {
                    var code = String(arguments[arguments.length - 1]);
                }
                else {
                    var code = '';
                }
                var args = [];
                for (var i = 0; i < arguments.length - 1; i++) {
                    var name = String(arguments[i]);
                    if (!name.match(identifierRegexp)) {
                        thisInterpreter.throwException(thisInterpreter.SYNTAX_ERROR, 'Invalid function argument: ' + name);
                    }
                    args.push(name);
                }
                args = args.join(', ');
                // Interestingly, the scope for constructed functions is the global scope,
                // even if they were constructed in some other scope.
                newFunc.parentScope = thisInterpreter.global;
                // Acorn needs to parse code in the context of a function or else 'return'
                // statements will be syntax errors.
                try {
                    var ast = acorn.parse('$ = function(' + args + ') {' + code + '};', Interpreter.PARSE_OPTIONS);
                }
                catch (e) {
                    // Acorn threw a SyntaxError.  Rethrow as a trappable error.
                    thisInterpreter.throwException(thisInterpreter.SYNTAX_ERROR, 'Invalid code: ' + e.message);
                }
                if (ast['body'].length !== 1) {
                    // Function('a', 'return a + 6;}; {alert(1);');
                    thisInterpreter.throwException(thisInterpreter.SYNTAX_ERROR, 'Invalid code in function body.');
                }
                newFunc.node = ast['body'][0]['expression']['right'];
                thisInterpreter.setProperty(newFunc, 'length', newFunc.node['length'], Interpreter.READONLY_DESCRIPTOR);
                return newFunc;
            };
            wrapper.id = this.functionCounter_++;
            this.FUNCTION = this.createObjectProto(this.FUNCTION_PROTO);
            this.setProperty(scope, 'Function', this.FUNCTION);
            // Manually setup type and prototype because createObj doesn't recognize
            // this object as a function (this.FUNCTION did not exist).
            this.setProperty(this.FUNCTION, 'prototype', this.FUNCTION_PROTO);
            this.FUNCTION.nativeFunc = wrapper;
            // Configure Function.prototype.
            this.setProperty(this.FUNCTION_PROTO, 'constructor', this.FUNCTION, Interpreter.NONENUMERABLE_DESCRIPTOR);
            this.FUNCTION_PROTO.nativeFunc = function () { };
            this.FUNCTION_PROTO.nativeFunc.id = this.functionCounter_++;
            this.setProperty(this.FUNCTION_PROTO, 'length', 0, Interpreter.READONLY_DESCRIPTOR);
            var boxThis = function (value) {
                // In non-strict mode 'this' must be an object.
                if ((!value || !value.isObject) && !thisInterpreter.getScope().strict) {
                    if (value === undefined || value === null) {
                        // 'Undefined' and 'null' are changed to global object.
                        value = thisInterpreter.global;
                    }
                    else {
                        // Primitives must be boxed in non-strict mode.
                        var box = thisInterpreter.createObjectProto(thisInterpreter.getPrototype(value));
                        box.data = value;
                        value = box;
                    }
                }
                return value;
            };
            wrapper = function (thisArg, args) {
                var state = thisInterpreter.stateStack[thisInterpreter.stateStack.length - 1];
                // Rewrite the current 'CallExpression' to apply a different function.
                state.func_ = this;
                // Assign the 'this' object.
                state.funcThis_ = boxThis(thisArg);
                // Bind any provided arguments.
                state.arguments_ = [];
                if (args !== null && args !== undefined) {
                    if (args.isObject) {
                        state.arguments_ = thisInterpreter.pseudoToNative(args);
                    }
                    else {
                        thisInterpreter.throwException(thisInterpreter.TYPE_ERROR, 'CreateListFromArrayLike called on non-object');
                    }
                }
                state.doneExec_ = false;
            };
            this.setNativeFunctionPrototype(this.FUNCTION, 'apply', wrapper);
            wrapper = function (thisArg, var_args) {
                var state = thisInterpreter.stateStack[thisInterpreter.stateStack.length - 1];
                // Rewrite the current 'CallExpression' to call a different function.
                state.func_ = this;
                // Assign the 'this' object.
                state.funcThis_ = boxThis(thisArg);
                // Bind any provided arguments.
                state.arguments_ = [];
                for (var i = 1; i < arguments.length; i++) {
                    state.arguments_.push(arguments[i]);
                }
                state.doneExec_ = false;
            };
            this.setNativeFunctionPrototype(this.FUNCTION, 'call', wrapper);
            this.polyfills_.push(
            // Polyfill copied from:
            // developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_objects/Function/bind
            "Object.defineProperty(Function.prototype, 'bind',", "{configurable: true, writable: true, value:", "function(oThis) {", "if (typeof this !== 'function') {", "throw TypeError('What is trying to be bound is not callable');", "}", "var aArgs   = Array.prototype.slice.call(arguments, 1),", "fToBind = this,", "fNOP    = function() {},", "fBound  = function() {", "return fToBind.apply(this instanceof fNOP", "? this", ": oThis,", "aArgs.concat(Array.prototype.slice.call(arguments)));", "};", "if (this.prototype) {", "fNOP.prototype = this.prototype;", "}", "fBound.prototype = new fNOP();", "return fBound;", "}", "});", "");
            // Function has no parent to inherit from, so it needs its own mandatory
            // toString and valueOf functions.
            wrapper = function () {
                return this.toString();
            };
            this.setNativeFunctionPrototype(this.FUNCTION, 'toString', wrapper);
            this.setProperty(this.FUNCTION, 'toString', this.createNativeFunction(wrapper, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            wrapper = function () {
                return this.valueOf();
            };
            this.setNativeFunctionPrototype(this.FUNCTION, 'valueOf', wrapper);
            this.setProperty(this.FUNCTION, 'valueOf', this.createNativeFunction(wrapper, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
        };
        ;
        /**
         * Initialize the Object class.
         * @param {!Interpreter.MyObject} scope Global scope.
         */
        Interpreter.prototype.initObject = function (scope) {
            var thisInterpreter = this;
            var wrapper;
            // Object constructor.
            wrapper = function (value) {
                if (value === undefined || value === null) {
                    // Create a new object.
                    if (thisInterpreter.calledWithNew()) {
                        // Called as new Object().
                        return this;
                    }
                    else {
                        // Called as Object().
                        return thisInterpreter.createObjectProto(thisInterpreter.OBJECT_PROTO);
                    }
                }
                if (!value.isObject) {
                    // Wrap the value as an object.
                    var box = thisInterpreter.createObjectProto(thisInterpreter.getPrototype(value));
                    box.data = value;
                    return box;
                }
                // Return the provided object.
                return value;
            };
            this.OBJECT = this.createNativeFunction(wrapper, true);
            // Throw away the created prototype and use the root prototype.
            this.setProperty(this.OBJECT, 'prototype', this.OBJECT_PROTO);
            this.setProperty(this.OBJECT_PROTO, 'constructor', this.OBJECT);
            this.setProperty(scope, 'Object', this.OBJECT);
            /**
             * Checks if the provided value is null or undefined.
             * If so, then throw an error in the call stack.
             * @param {Interpreter.MyValue} value Value to check.
             */
            var throwIfNullUndefined = function (value) {
                if (value === undefined || value === null) {
                    thisInterpreter.throwException(thisInterpreter.TYPE_ERROR, "Cannot convert '" + value + "' to object");
                }
            };
            // Static methods on Object.
            wrapper = function (obj) {
                throwIfNullUndefined(obj);
                var props = obj.isObject ? obj.properties : obj;
                return thisInterpreter.nativeToPseudo(Object.getOwnPropertyNames(props));
            };
            this.setProperty(this.OBJECT, 'getOwnPropertyNames', this.createNativeFunction(wrapper, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            wrapper = function (obj) {
                throwIfNullUndefined(obj);
                if (!obj.isObject) {
                    return thisInterpreter.nativeToPseudo(Object.keys(obj));
                }
                return thisInterpreter.nativeToPseudo(Object.keys(obj.properties));
            };
            this.setProperty(this.OBJECT, 'keys', this.createNativeFunction(wrapper, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            wrapper = function (proto) {
                // Support for the second argument is the responsibility of a polyfill.
                if (proto === null) {
                    return thisInterpreter.createObjectProto(null);
                }
                if (proto === undefined || !proto.isObject) {
                    thisInterpreter.throwException(thisInterpreter.TYPE_ERROR, 'Object prototype may only be an Object or null');
                }
                return thisInterpreter.createObjectProto(proto);
            };
            this.setProperty(this.OBJECT, 'create', this.createNativeFunction(wrapper, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            // Add a polyfill to handle create's second argument.
            this.polyfills_.push("(function() {", "var create_ = Object.create;", "Object.create = function(proto, props) {", "var obj = create_(proto);", "props && Object.defineProperties(obj, props);", "return obj;", "};", "})();", "");
            wrapper = function (obj, prop, descriptor) {
                prop = String(prop);
                if (!obj || !obj.isObject) {
                    thisInterpreter.throwException(thisInterpreter.TYPE_ERROR, 'Object.defineProperty called on non-object');
                }
                if (!descriptor || !descriptor.isObject) {
                    thisInterpreter.throwException(thisInterpreter.TYPE_ERROR, 'Property description must be an object');
                }
                if (!obj.properties[prop] && obj.preventExtensions) {
                    thisInterpreter.throwException(thisInterpreter.TYPE_ERROR, "Can't define property '" + prop + "', object is not extensible");
                }
                // The polyfill guarantees no inheritance and no getter functions.
                // Therefore the descriptor properties map is the native object needed.
                thisInterpreter.setProperty(obj, prop, ReferenceError, descriptor.properties);
                return obj;
            };
            this.setProperty(this.OBJECT, 'defineProperty', this.createNativeFunction(wrapper, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            this.polyfills_.push(
            // Flatten the descriptor to remove any inheritance or getter functions.
            "(function() {", "var defineProperty_ = Object.defineProperty;", "Object.defineProperty = function(obj, prop, d1) {", "var d2 = {};", "if ('configurable' in d1) d2.configurable = d1.configurable;", "if ('enumerable' in d1) d2.enumerable = d1.enumerable;", "if ('writable' in d1) d2.writable = d1.writable;", "if ('value' in d1) d2.value = d1.value;", "if ('get' in d1) d2.get = d1.get;", "if ('set' in d1) d2.set = d1.set;", "return defineProperty_(obj, prop, d2);", "};", "})();", "Object.defineProperty(Object, 'defineProperties',", "{configurable: true, writable: true, value:", "function(obj, props) {", "var keys = Object.keys(props);", "for (var i = 0; i < keys.length; i++) {", "Object.defineProperty(obj, keys[i], props[keys[i]]);", "}", "return obj;", "}", "});", "");
            wrapper = function (obj, prop) {
                if (!obj || !obj.isObject) {
                    thisInterpreter.throwException(thisInterpreter.TYPE_ERROR, 'Object.getOwnPropertyDescriptor called on non-object');
                }
                prop = String(prop);
                if (!(prop in obj.properties)) {
                    return undefined;
                }
                var descriptor = Object.getOwnPropertyDescriptor(obj.properties, prop);
                var getter = obj.getter[prop];
                var setter = obj.setter[prop];
                if (getter || setter) {
                    descriptor.get = getter;
                    descriptor.set = setter;
                    delete descriptor.value;
                    delete descriptor.writable;
                }
                var pseudoDescriptor = thisInterpreter.nativeToPseudo(descriptor);
                if ('value' in descriptor) {
                    thisInterpreter.setProperty(pseudoDescriptor, 'value', descriptor.value);
                }
                return pseudoDescriptor;
            };
            this.setProperty(this.OBJECT, 'getOwnPropertyDescriptor', this.createNativeFunction(wrapper, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            wrapper = function (obj) {
                throwIfNullUndefined(obj);
                return thisInterpreter.getPrototype(obj);
            };
            this.setProperty(this.OBJECT, 'getPrototypeOf', this.createNativeFunction(wrapper, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            wrapper = function (obj) {
                return Boolean(obj) && !obj.preventExtensions;
            };
            this.setProperty(this.OBJECT, 'isExtensible', this.createNativeFunction(wrapper, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            wrapper = function (obj) {
                if (obj && obj.isObject) {
                    obj.preventExtensions = true;
                }
                return obj;
            };
            this.setProperty(this.OBJECT, 'preventExtensions', this.createNativeFunction(wrapper, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            // Instance methods on Object.
            this.setNativeFunctionPrototype(this.OBJECT, 'toString', Interpreter.MyObject.prototype.toString);
            this.setNativeFunctionPrototype(this.OBJECT, 'toLocaleString', Interpreter.MyObject.prototype.toString);
            this.setNativeFunctionPrototype(this.OBJECT, 'valueOf', Interpreter.MyObject.prototype.valueOf);
            wrapper = function (prop) {
                throwIfNullUndefined(this);
                if (!this.isObject) {
                    return this.hasOwnProperty(prop);
                }
                return String(prop) in this.properties;
            };
            this.setNativeFunctionPrototype(this.OBJECT, 'hasOwnProperty', wrapper);
            wrapper = function (prop) {
                throwIfNullUndefined(this);
                return Object.prototype.propertyIsEnumerable.call(this.properties, prop);
            };
            this.setNativeFunctionPrototype(this.OBJECT, 'propertyIsEnumerable', wrapper);
            wrapper = function (obj) {
                while (true) {
                    // Note, circular loops shouldn't be possible.
                    obj = thisInterpreter.getPrototype(obj);
                    if (!obj) {
                        // No parent; reached the top.
                        return false;
                    }
                    if (obj === this) {
                        return true;
                    }
                }
            };
            this.setNativeFunctionPrototype(this.OBJECT, 'isPrototypeOf', wrapper);
        };
        ;
        /**
         * Initialize the Array class.
         * @param {!Interpreter.MyObject} scope Global scope.
         */
        Interpreter.prototype.initArray = function (scope) {
            var thisInterpreter = this;
            var getInt = function (obj, def) {
                // Return an integer, or the default.
                var n = obj ? Math.floor(obj) : def;
                if (isNaN(n)) {
                    n = def;
                }
                return n;
            };
            var wrapper;
            // Array constructor.
            wrapper = function (var_args) {
                if (thisInterpreter.calledWithNew()) {
                    // Called as new Array().
                    var newArray = this;
                }
                else {
                    // Called as Array().
                    var newArray = thisInterpreter.createObjectProto(thisInterpreter.ARRAY_PROTO);
                }
                var first = arguments[0];
                if (arguments.length === 1 && typeof first === 'number') {
                    if (isNaN(Interpreter.legalArrayLength(first))) {
                        thisInterpreter.throwException(thisInterpreter.RANGE_ERROR, 'Invalid array length');
                    }
                    newArray.properties.length = first;
                }
                else {
                    for (var i = 0; i < arguments.length; i++) {
                        newArray.properties[i] = arguments[i];
                    }
                    newArray.properties.length = i;
                }
                return newArray;
            };
            this.ARRAY = this.createNativeFunction(wrapper, true);
            this.ARRAY_PROTO = this.ARRAY.properties['prototype'];
            this.setProperty(scope, 'Array', this.ARRAY);
            // Static methods on Array.
            wrapper = function (obj) {
                return obj && obj.class === 'Array';
            };
            this.setProperty(this.ARRAY, 'isArray', this.createNativeFunction(wrapper, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            // Instance methods on Array.
            wrapper = function () {
                return Array.prototype.pop.call(this.properties);
            };
            this.setNativeFunctionPrototype(this.ARRAY, 'pop', wrapper);
            wrapper = function (var_args) {
                return Array.prototype.push.apply(this.properties, arguments);
            };
            this.setNativeFunctionPrototype(this.ARRAY, 'push', wrapper);
            wrapper = function () {
                return Array.prototype.shift.call(this.properties);
            };
            this.setNativeFunctionPrototype(this.ARRAY, 'shift', wrapper);
            wrapper = function (var_args) {
                return Array.prototype.unshift.apply(this.properties, arguments);
            };
            this.setNativeFunctionPrototype(this.ARRAY, 'unshift', wrapper);
            wrapper = function () {
                Array.prototype.reverse.call(this.properties);
                return this;
            };
            this.setNativeFunctionPrototype(this.ARRAY, 'reverse', wrapper);
            wrapper = function (index, howmany /*, var_args*/) {
                var list = Array.prototype.splice.apply(this.properties, arguments);
                return thisInterpreter.nativeToPseudo(list);
            };
            this.setNativeFunctionPrototype(this.ARRAY, 'splice', wrapper);
            wrapper = function (opt_begin, opt_end) {
                var list = Array.prototype.slice.call(this.properties, opt_begin, opt_end);
                return thisInterpreter.nativeToPseudo(list);
            };
            this.setNativeFunctionPrototype(this.ARRAY, 'slice', wrapper);
            wrapper = function (opt_separator) {
                return Array.prototype.join.call(this.properties, opt_separator);
            };
            this.setNativeFunctionPrototype(this.ARRAY, 'join', wrapper);
            wrapper = function (var_args) {
                var list = [];
                var length = 0;
                // Start by copying the current array.
                var iLength = thisInterpreter.getProperty(this, 'length');
                for (var i = 0; i < iLength; i++) {
                    if (thisInterpreter.hasProperty(this, i)) {
                        var element = thisInterpreter.getProperty(this, i);
                        list[length] = element;
                    }
                    length++;
                }
                // Loop through all arguments and copy them in.
                for (var i = 0; i < arguments.length; i++) {
                    var value = arguments[i];
                    if (thisInterpreter.isa(value, thisInterpreter.ARRAY)) {
                        var jLength = thisInterpreter.getProperty(value, 'length');
                        for (var j = 0; j < jLength; j++) {
                            if (thisInterpreter.hasProperty(value, j)) {
                                list[length] = thisInterpreter.getProperty(value, j);
                            }
                            length++;
                        }
                    }
                    else {
                        list[length] = value;
                    }
                }
                return thisInterpreter.nativeToPseudo(list);
            };
            this.setNativeFunctionPrototype(this.ARRAY, 'concat', wrapper);
            wrapper = function (searchElement, opt_fromIndex) {
                return Array.prototype.indexOf.apply(this.properties, arguments);
            };
            this.setNativeFunctionPrototype(this.ARRAY, 'indexOf', wrapper);
            wrapper = function (searchElement, opt_fromIndex) {
                return Array.prototype.lastIndexOf.apply(this.properties, arguments);
            };
            this.setNativeFunctionPrototype(this.ARRAY, 'lastIndexOf', wrapper);
            wrapper = function () {
                Array.prototype.sort.call(this.properties);
                return this;
            };
            this.setNativeFunctionPrototype(this.ARRAY, 'sort', wrapper);
            this.polyfills_.push(
            // Polyfill copied from:
            // developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/every
            "Object.defineProperty(Array.prototype, 'every',", "{configurable: true, writable: true, value:", "function(callbackfn, thisArg) {", "if (!this || typeof callbackfn !== 'function') throw TypeError();", "var T, k;", "var O = Object(this);", "var len = O.length >>> 0;", "if (arguments.length > 1) T = thisArg;", "k = 0;", "while (k < len) {", "if (k in O && !callbackfn.call(T, O[k], k, O)) return false;", "k++;", "}", "return true;", "}", "});", 
            // Polyfill copied from:
            // developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
            "Object.defineProperty(Array.prototype, 'filter',", "{configurable: true, writable: true, value:", "function(fun/*, thisArg*/) {", "if (this === void 0 || this === null || typeof fun !== 'function') throw TypeError();", "var t = Object(this);", "var len = t.length >>> 0;", "var res = [];", "var thisArg = arguments.length >= 2 ? arguments[1] : void 0;", "for (var i = 0; i < len; i++) {", "if (i in t) {", "var val = t[i];", "if (fun.call(thisArg, val, i, t)) res.push(val);", "}", "}", "return res;", "}", "});", 
            // Polyfill copied from:
            // developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
            "Object.defineProperty(Array.prototype, 'forEach',", "{configurable: true, writable: true, value:", "function(callback, thisArg) {", "if (!this || typeof callback !== 'function') throw TypeError();", "var T, k;", "var O = Object(this);", "var len = O.length >>> 0;", "if (arguments.length > 1) T = thisArg;", "k = 0;", "while (k < len) {", "if (k in O) callback.call(T, O[k], k, O);", "k++;", "}", "}", "});", 
            // Polyfill copied from:
            // developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/map
            "Object.defineProperty(Array.prototype, 'map',", "{configurable: true, writable: true, value:", "function(callback, thisArg) {", "if (!this || typeof callback !== 'function') new TypeError;", "var T, A, k;", "var O = Object(this);", "var len = O.length >>> 0;", "if (arguments.length > 1) T = thisArg;", "A = new Array(len);", "k = 0;", "while (k < len) {", "if (k in O) A[k] = callback.call(T, O[k], k, O);", "k++;", "}", "return A;", "}", "});", 
            // Polyfill copied from:
            // developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce
            "Object.defineProperty(Array.prototype, 'reduce',", "{configurable: true, writable: true, value:", "function(callback /*, initialValue*/) {", "if (!this || typeof callback !== 'function') throw TypeError();", "var t = Object(this), len = t.length >>> 0, k = 0, value;", "if (arguments.length === 2) {", "value = arguments[1];", "} else {", "while (k < len && !(k in t)) k++;", "if (k >= len) {", "throw TypeError('Reduce of empty array with no initial value');", "}", "value = t[k++];", "}", "for (; k < len; k++) {", "if (k in t) value = callback(value, t[k], k, t);", "}", "return value;", "}", "});", 
            // Polyfill copied from:
            // developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/ReduceRight
            "Object.defineProperty(Array.prototype, 'reduceRight',", "{configurable: true, writable: true, value:", "function(callback /*, initialValue*/) {", "if (null === this || 'undefined' === typeof this || 'function' !== typeof callback) throw TypeError();", "var t = Object(this), len = t.length >>> 0, k = len - 1, value;", "if (arguments.length >= 2) {", "value = arguments[1];", "} else {", "while (k >= 0 && !(k in t)) k--;", "if (k < 0) {", "throw TypeError('Reduce of empty array with no initial value');", "}", "value = t[k--];", "}", "for (; k >= 0; k--) {", "if (k in t) value = callback(value, t[k], k, t);", "}", "return value;", "}", "});", 
            // Polyfill copied from:
            // developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/some
            "Object.defineProperty(Array.prototype, 'some',", "{configurable: true, writable: true, value:", "function(fun/*, thisArg*/) {", "if (!this || typeof fun !== 'function') throw TypeError();", "var t = Object(this);", "var len = t.length >>> 0;", "var thisArg = arguments.length >= 2 ? arguments[1] : void 0;", "for (var i = 0; i < len; i++) {", "if (i in t && fun.call(thisArg, t[i], i, t)) {", "return true;", "}", "}", "return false;", "}", "});", "(function() {", "var sort_ = Array.prototype.sort;", "Array.prototype.sort = function(opt_comp) {", 
            // Fast native sort.
            "if (typeof opt_comp !== 'function') {", "return sort_.call(this);", "}", 
            // Slow bubble sort.
            "for (var i = 0; i < this.length; i++) {", "var changes = 0;", "for (var j = 0; j < this.length - i - 1; j++) {", "if (opt_comp(this[j], this[j + 1]) > 0) {", "var swap = this[j];", "this[j] = this[j + 1];", "this[j + 1] = swap;", "changes++;", "}", "}", "if (!changes) break;", "}", "return this;", "};", "})();", "Object.defineProperty(Array.prototype, 'toLocaleString',", "{configurable: true, writable: true, value:", "function() {", "var out = [];", "for (var i = 0; i < this.length; i++) {", "out[i] = (this[i] === null || this[i] === undefined) ? '' : this[i].toLocaleString();", "}", "return out.join(',');", "}", "});", "");
        };
        ;
        /**
         * Initialize the String class.
         * @param {!Interpreter.MyObject} scope Global scope.
         */
        Interpreter.prototype.initString = function (scope) {
            var thisInterpreter = this;
            var wrapper;
            // String constructor.
            wrapper = function (value) {
                value = String(value);
                if (thisInterpreter.calledWithNew()) {
                    // Called as new String().
                    this.data = value;
                    return this;
                }
                else {
                    // Called as String().
                    return value;
                }
            };
            this.STRING = this.createNativeFunction(wrapper, true);
            this.setProperty(scope, 'String', this.STRING);
            // Static methods on String.
            this.setProperty(this.STRING, 'fromCharCode', this.createNativeFunction(String.fromCharCode, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            // Instance methods on String.
            // Methods with exclusively primitive arguments.
            var functions = ['trim', 'toLowerCase', 'toUpperCase',
                'toLocaleLowerCase', 'toLocaleUpperCase', 'charAt', 'charCodeAt',
                'substring', 'slice', 'substr', 'indexOf', 'lastIndexOf', 'concat'];
            for (var i = 0; i < functions.length; i++) {
                this.setNativeFunctionPrototype(this.STRING, functions[i], String.prototype[functions[i]]);
            }
            wrapper = function (compareString, locales, options) {
                locales = locales ? thisInterpreter.pseudoToNative(locales) : undefined;
                options = options ? thisInterpreter.pseudoToNative(options) : undefined;
                return String(this).localeCompare(compareString, locales, options);
            };
            this.setNativeFunctionPrototype(this.STRING, 'localeCompare', wrapper);
            wrapper = function (separator, limit) {
                if (thisInterpreter.isa(separator, thisInterpreter.REGEXP)) {
                    separator = separator.data;
                }
                var jsList = String(this).split(separator, limit);
                return thisInterpreter.nativeToPseudo(jsList);
            };
            this.setNativeFunctionPrototype(this.STRING, 'split', wrapper);
            wrapper = function (regexp) {
                regexp = regexp ? regexp.data : undefined;
                var match = String(this).match(regexp);
                if (!match) {
                    return null;
                }
                return thisInterpreter.nativeToPseudo(match);
            };
            this.setNativeFunctionPrototype(this.STRING, 'match', wrapper);
            wrapper = function (regexp) {
                regexp = regexp ? regexp.data : undefined;
                return String(this).search(regexp);
            };
            this.setNativeFunctionPrototype(this.STRING, 'search', wrapper);
            wrapper = function (substr, newSubstr) {
                // Support for function replacements is the responsibility of a polyfill.
                return String(this).replace(substr.data || substr, newSubstr);
            };
            this.setNativeFunctionPrototype(this.STRING, 'replace', wrapper);
            // Add a polyfill to handle replace's second argument being a function.
            this.polyfills_.push("(function() {", "var replace_ = String.prototype.replace;", "String.prototype.replace = function(substr, newSubstr) {", "if (typeof newSubstr !== 'function') {", 
            // string.replace(string|regexp, string)
            "return replace_.call(this, substr, newSubstr);", "}", "var str = this;", "if (substr instanceof RegExp) {", // string.replace(regexp, function)
            "var subs = [];", "var m = substr.exec(str);", "while (m) {", "m.push(m.index, str);", "var inject = newSubstr.apply(null, m);", "subs.push([m.index, m[0].length, inject]);", "m = substr.global ? substr.exec(str) : null;", "}", "for (var i = subs.length - 1; i >= 0; i--) {", "str = str.substring(0, subs[i][0]) + subs[i][2] + " +
                "str.substring(subs[i][0] + subs[i][1]);", "}", "} else {", // string.replace(string, function)
            "var i = str.indexOf(substr);", "if (i !== -1) {", "var inject = newSubstr(str.substr(i, substr.length), i, str);", "str = str.substring(0, i) + inject + " +
                "str.substring(i + substr.length);", "}", "}", "return str;", "};", "})();", "");
        };
        ;
        /**
         * Initialize the Boolean class.
         * @param {!Interpreter.MyObject} scope Global scope.
         */
        Interpreter.prototype.initBoolean = function (scope) {
            var thisInterpreter = this;
            var wrapper;
            // Boolean constructor.
            wrapper = function (value) {
                value = Boolean(value);
                if (thisInterpreter.calledWithNew()) {
                    // Called as new Boolean().
                    this.data = value;
                    return this;
                }
                else {
                    // Called as Boolean().
                    return value;
                }
            };
            this.BOOLEAN = this.createNativeFunction(wrapper, true);
            this.setProperty(scope, 'Boolean', this.BOOLEAN);
        };
        ;
        /**
         * Initialize the Number class.
         * @param {!Interpreter.MyObject} scope Global scope.
         */
        Interpreter.prototype.initNumber = function (scope) {
            var thisInterpreter = this;
            var wrapper;
            // Number constructor.
            wrapper = function (value) {
                value = Number(value);
                if (thisInterpreter.calledWithNew()) {
                    // Called as new Number().
                    this.data = value;
                    return this;
                }
                else {
                    // Called as Number().
                    return value;
                }
            };
            this.NUMBER = this.createNativeFunction(wrapper, true);
            this.setProperty(scope, 'Number', this.NUMBER);
            var numConsts = ['MAX_VALUE', 'MIN_VALUE', 'NaN', 'NEGATIVE_INFINITY',
                'POSITIVE_INFINITY'];
            for (var i = 0; i < numConsts.length; i++) {
                this.setProperty(this.NUMBER, numConsts[i], Number[numConsts[i]], Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
            }
            // Instance methods on Number.
            wrapper = function (fractionDigits) {
                try {
                    return Number(this).toExponential(fractionDigits);
                }
                catch (e) {
                    // Throws if fractionDigits isn't within 0-20.
                    thisInterpreter.throwException(thisInterpreter.ERROR, e.message);
                }
            };
            this.setNativeFunctionPrototype(this.NUMBER, 'toExponential', wrapper);
            wrapper = function (digits) {
                try {
                    return Number(this).toFixed(digits);
                }
                catch (e) {
                    // Throws if digits isn't within 0-20.
                    thisInterpreter.throwException(thisInterpreter.ERROR, e.message);
                }
            };
            this.setNativeFunctionPrototype(this.NUMBER, 'toFixed', wrapper);
            wrapper = function (precision) {
                try {
                    return Number(this).toPrecision(precision);
                }
                catch (e) {
                    // Throws if precision isn't within range (depends on implementation).
                    thisInterpreter.throwException(thisInterpreter.ERROR, e.message);
                }
            };
            this.setNativeFunctionPrototype(this.NUMBER, 'toPrecision', wrapper);
            wrapper = function (radix) {
                try {
                    return Number(this).toString(radix);
                }
                catch (e) {
                    // Throws if radix isn't within 2-36.
                    thisInterpreter.throwException(thisInterpreter.ERROR, e.message);
                }
            };
            this.setNativeFunctionPrototype(this.NUMBER, 'toString', wrapper);
            wrapper = function (locales, options) {
                locales = locales ? thisInterpreter.pseudoToNative(locales) : undefined;
                options = options ? thisInterpreter.pseudoToNative(options) : undefined;
                return Number(this).toLocaleString(locales, options);
            };
            this.setNativeFunctionPrototype(this.NUMBER, 'toLocaleString', wrapper);
        };
        ;
        /**
         * Initialize the Date class.
         * @param {!Interpreter.MyObject} scope Global scope.
         */
        Interpreter.prototype.initDate = function (scope) {
            var thisInterpreter = this;
            var wrapper;
            // Date constructor.
            wrapper = function (value, var_args) {
                if (!thisInterpreter.calledWithNew()) {
                    // Called as Date().
                    // Calling Date() as a function returns a string, no arguments are heeded.
                    return Date();
                }
                // Called as new Date().
                var args = [null].concat([].slice.call(arguments));
                this.data = new (Function.prototype.bind.apply(Date, args));
                return this;
            };
            this.DATE = this.createNativeFunction(wrapper, true);
            this.setProperty(scope, 'Date', this.DATE);
            // Static methods on Date.
            this.setProperty(this.DATE, 'now', this.createNativeFunction(Date.now, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            this.setProperty(this.DATE, 'parse', this.createNativeFunction(Date.parse, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            this.setProperty(this.DATE, 'UTC', this.createNativeFunction(Date.UTC, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
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
                wrapper = (function (nativeFunc) {
                    return function (var_args) {
                        var args = [];
                        for (var i = 0; i < arguments.length; i++) {
                            args[i] = thisInterpreter.pseudoToNative(arguments[i]);
                        }
                        return this.data[nativeFunc].apply(this.data, args);
                    };
                })(functions[i]);
                this.setNativeFunctionPrototype(this.DATE, functions[i], wrapper);
            }
        };
        ;
        /**
         * Initialize Regular Expression object.
         * @param {!Interpreter.MyObject} scope Global scope.
         */
        Interpreter.prototype.initRegExp = function (scope) {
            var thisInterpreter = this;
            var wrapper;
            // RegExp constructor.
            wrapper = function (pattern, flags) {
                if (thisInterpreter.calledWithNew()) {
                    // Called as new RegExp().
                    var rgx = this;
                }
                else {
                    // Called as RegExp().
                    var rgx = thisInterpreter.createObjectProto(thisInterpreter.REGEXP_PROTO);
                }
                pattern = pattern ? pattern.toString() : '';
                flags = flags ? flags.toString() : '';
                thisInterpreter.populateRegExp(rgx, new RegExp(pattern, flags));
                return rgx;
            };
            this.REGEXP = this.createNativeFunction(wrapper, true);
            this.REGEXP_PROTO = this.REGEXP.properties['prototype'];
            this.setProperty(scope, 'RegExp', this.REGEXP);
            this.setProperty(this.REGEXP.properties['prototype'], 'global', undefined, Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
            this.setProperty(this.REGEXP.properties['prototype'], 'ignoreCase', undefined, Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
            this.setProperty(this.REGEXP.properties['prototype'], 'multiline', undefined, Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
            this.setProperty(this.REGEXP.properties['prototype'], 'source', '(?:)', Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
            wrapper = function (str) {
                return this.data.test(str);
            };
            this.setNativeFunctionPrototype(this.REGEXP, 'test', wrapper);
            wrapper = function (str) {
                str = str.toString();
                // Get lastIndex from wrapped regex, since this is settable.
                this.data.lastIndex =
                    Number(thisInterpreter.getProperty(this, 'lastIndex'));
                var match = this.data.exec(str);
                thisInterpreter.setProperty(this, 'lastIndex', this.data.lastIndex);
                if (match) {
                    var result = thisInterpreter.createObjectProto(thisInterpreter.ARRAY_PROTO);
                    for (var i = 0; i < match.length; i++) {
                        thisInterpreter.setProperty(result, i, match[i]);
                    }
                    // match has additional properties.
                    thisInterpreter.setProperty(result, 'index', match.index);
                    thisInterpreter.setProperty(result, 'input', match.input);
                    return result;
                }
                return null;
            };
            this.setNativeFunctionPrototype(this.REGEXP, 'exec', wrapper);
        };
        ;
        /**
         * Initialize the Error class.
         * @param {!Interpreter.MyObject} scope Global scope.
         */
        Interpreter.prototype.initError = function (scope) {
            var thisInterpreter = this;
            // Error constructor.
            this.ERROR = this.createNativeFunction(function (opt_message) {
                if (thisInterpreter.calledWithNew()) {
                    // Called as new Error().
                    var newError = this;
                }
                else {
                    // Called as Error().
                    var newError = thisInterpreter.createObject(thisInterpreter.ERROR);
                }
                if (opt_message) {
                    thisInterpreter.setProperty(newError, 'message', String(opt_message), Interpreter.NONENUMERABLE_DESCRIPTOR);
                }
                return newError;
            }, true);
            this.setProperty(scope, 'Error', this.ERROR);
            this.setProperty(this.ERROR.properties['prototype'], 'message', '', Interpreter.NONENUMERABLE_DESCRIPTOR);
            this.setProperty(this.ERROR.properties['prototype'], 'name', 'Error', Interpreter.NONENUMERABLE_DESCRIPTOR);
            var createErrorSubclass = function (name) {
                var constructor = thisInterpreter.createNativeFunction(function (opt_message) {
                    if (thisInterpreter.calledWithNew()) {
                        // Called as new XyzError().
                        var newError = this;
                    }
                    else {
                        // Called as XyzError().
                        var newError = thisInterpreter.createObject(constructor);
                    }
                    if (opt_message) {
                        thisInterpreter.setProperty(newError, 'message', String(opt_message), Interpreter.NONENUMERABLE_DESCRIPTOR);
                    }
                    return newError;
                }, true);
                thisInterpreter.setProperty(constructor, 'prototype', thisInterpreter.createObject(thisInterpreter.ERROR));
                thisInterpreter.setProperty(constructor.properties['prototype'], 'name', name, Interpreter.NONENUMERABLE_DESCRIPTOR);
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
        ;
        /**
         * Initialize Math object.
         * @param {!Interpreter.MyObject} scope Global scope.
         */
        Interpreter.prototype.initMath = function (scope) {
            var thisInterpreter = this;
            var myMath = this.createObjectProto(this.OBJECT_PROTO);
            this.setProperty(scope, 'Math', myMath);
            var mathConsts = ['E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'PI',
                'SQRT1_2', 'SQRT2'];
            for (var i = 0; i < mathConsts.length; i++) {
                this.setProperty(myMath, mathConsts[i], Math[mathConsts[i]], Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
            }
            var numFunctions = ['abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos',
                'exp', 'floor', 'log', 'max', 'min', 'pow', 'random',
                'round', 'sin', 'sqrt', 'tan'];
            for (var i = 0; i < numFunctions.length; i++) {
                this.setProperty(myMath, numFunctions[i], this.createNativeFunction(Math[numFunctions[i]], false), Interpreter.NONENUMERABLE_DESCRIPTOR);
            }
        };
        ;
        /**
         * Initialize JSON object.
         * @param {!Interpreter.MyObject} scope Global scope.
         */
        Interpreter.prototype.initJSON = function (scope) {
            var thisInterpreter = this;
            var myJSON = thisInterpreter.createObjectProto(this.OBJECT_PROTO);
            this.setProperty(scope, 'JSON', myJSON);
            var wrapper = function (text) {
                try {
                    var nativeObj = JSON.parse(text.toString());
                }
                catch (e) {
                    thisInterpreter.throwException(thisInterpreter.SYNTAX_ERROR, e.message);
                }
                return thisInterpreter.nativeToPseudo(nativeObj);
            };
            this.setProperty(myJSON, 'parse', this.createNativeFunction(wrapper, false));
            wrapper = function (value) {
                var nativeObj = thisInterpreter.pseudoToNative(value);
                try {
                    var str = JSON.stringify(nativeObj);
                }
                catch (e) {
                    thisInterpreter.throwException(thisInterpreter.TYPE_ERROR, e.message);
                }
                return str;
            };
            this.setProperty(myJSON, 'stringify', this.createNativeFunction(wrapper, false));
        };
        ;
        /**
         * Is an object of a certain class?
         * @param {Interpreter.MyValue} child Object to check.
         * @param {Interpreter.MyObject} constructor Constructor of object.
         * @return {boolean} True if object is the class or inherits from it.
         *     False otherwise.
         */
        Interpreter.prototype.isa = function (child, constructor) {
            if (child === null || child === undefined || !constructor) {
                return false;
            }
            var proto = constructor.properties['prototype'];
            if (child === proto) {
                return true;
            }
            // The first step up the prototype chain is harder since the child might be
            // a primitive value.  Subsequent steps can just follow the .proto property.
            var childObj = this.getPrototype(child);
            while (childObj) {
                if (childObj === proto) {
                    return true;
                }
                childObj = childObj.proto;
            }
            return false;
        };
        ;
        /**
         * Is a value a legal integer for an array length?
         * @param {Interpreter.MyValue} x Value to check.
         * @return {number} Zero, or a positive integer if the value can be
         *     converted to such.  NaN otherwise.
         */
        Interpreter.legalArrayLength = function (x) {
            var n = x >>> 0;
            // Array length must be between 0 and 2^32-1 (inclusive).
            return (n === Number(x)) ? n : NaN;
        };
        ;
        /**
         * Is a value a legal integer for an array index?
         * @param {Interpreter.MyValue} x Value to check.
         * @return {number} Zero, or a positive integer if the value can be
         *     converted to such.  NaN otherwise.
         */
        Interpreter.legalArrayIndex = function (x) {
            var n = x >>> 0;
            // Array index cannot be 2^32-1, otherwise length would be 2^32.
            // 0xffffffff is 2^32-1.
            return (String(n) === String(x) && n !== 0xffffffff) ? n : NaN;
        };
        ;
        /**
         * Create a new data object based on a constructor's prototype.
         * @param {Interpreter.MyObject} constructor Parent constructor function,
         *     or null if scope object.
         * @return {!Interpreter.MyObject} New data object.
         */
        Interpreter.prototype.createObject = function (constructor) {
            return this.createObjectProto(constructor &&
                constructor.properties['prototype']);
        };
        ;
        /**
         * Create a new data object based on a prototype.
         * @param {Interpreter.MyObject} proto Prototype object.
         * @return {!Interpreter.MyObject} New data object.
         */
        Interpreter.prototype.createObjectProto = function (proto) {
            var obj = new Interpreter.MyObject(proto);
            // Functions have prototype objects.
            if (this.isa(obj, this.FUNCTION)) {
                this.setProperty(obj, 'prototype', this.createObjectProto(this.OBJECT_PROTO || null));
                obj.class = 'Function';
            }
            // Arrays have length.
            if (this.isa(obj, this.ARRAY)) {
                this.setProperty(obj, 'length', 0, { configurable: false, enumerable: false, writable: true });
                obj.class = 'Array';
            }
            if (this.isa(obj, this.ERROR)) {
                obj.class = 'Error';
            }
            return obj;
        };
        ;
        /**
         * Initialize a pseudo regular expression object based on a native regular
         * expression object.
         * @param {!Interpreter.MyObject} pseudoRegexp The existing object to set.
         * @param {!RegExp} nativeRegexp The native regular expression.
         */
        Interpreter.prototype.populateRegExp = function (pseudoRegexp, nativeRegexp) {
            pseudoRegexp.data = nativeRegexp;
            // lastIndex is settable, all others are read-only attributes
            this.setProperty(pseudoRegexp, 'lastIndex', nativeRegexp.lastIndex, Interpreter.NONENUMERABLE_DESCRIPTOR);
            this.setProperty(pseudoRegexp, 'source', nativeRegexp.source, Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
            this.setProperty(pseudoRegexp, 'global', nativeRegexp.global, Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
            this.setProperty(pseudoRegexp, 'ignoreCase', nativeRegexp.ignoreCase, Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
            this.setProperty(pseudoRegexp, 'multiline', nativeRegexp.multiline, Interpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
        };
        ;
        /**
         * Create a new function.
         * @param {!Object} node AST node defining the function.
         * @param {!Object} scope Parent scope.
         * @return {!Interpreter.MyObject} New function.
         */
        Interpreter.prototype.createFunction = function (node, scope) {
            var func = this.createObjectProto(this.FUNCTION_PROTO);
            func.parentScope = scope;
            func.node = node;
            this.setProperty(func, 'length', func.node['params'].length, Interpreter.READONLY_DESCRIPTOR);
            return func;
        };
        ;
        /**
         * Create a new native function.
         * @param {!Function} nativeFunc JavaScript function.
         * @param {boolean=} opt_constructor If true, the function's
         * prototype will have its constructor property set to the function.
         * If false, the function cannot be called as a constructor (e.g. escape).
         * Defaults to undefined.
         * @return {!Interpreter.MyObject} New function.
         */
        Interpreter.prototype.createNativeFunction = function (nativeFunc, opt_constructor) {
            var func = this.createObjectProto(this.FUNCTION_PROTO);
            func.nativeFunc = nativeFunc;
            nativeFunc.id = this.functionCounter_++;
            this.setProperty(func, 'length', nativeFunc.length, Interpreter.READONLY_DESCRIPTOR);
            if (opt_constructor) {
                this.setProperty(func.properties['prototype'], 'constructor', func, Interpreter.NONENUMERABLE_DESCRIPTOR);
            }
            else if (opt_constructor === false) {
                func.illegalConstructor = true;
                this.setProperty(func, 'prototype', undefined);
            }
            return func;
        };
        ;
        /**
         * Create a new native asynchronous function.
         * @param {!Function} asyncFunc JavaScript function.
         * @return {!Interpreter.MyObject} New function.
         */
        Interpreter.prototype.createAsyncFunction = function (asyncFunc) {
            var func = this.createObjectProto(this.FUNCTION_PROTO);
            func.asyncFunc = asyncFunc;
            asyncFunc.id = this.functionCounter_++;
            this.setProperty(func, 'length', asyncFunc.length, Interpreter.READONLY_DESCRIPTOR);
            return func;
        };
        ;
        /**
         * Converts from a native JS object or value to a JS interpreter object.
         * Can handle JSON-style values.
         * @param {*} nativeObj The native JS object to be converted.
         * @return {Interpreter.MyValue} The equivalent JS interpreter object.
         */
        Interpreter.prototype.nativeToPseudo = function (nativeObj) {
            if (typeof nativeObj === 'boolean' ||
                typeof nativeObj === 'number' ||
                typeof nativeObj === 'string' ||
                nativeObj === null || nativeObj === undefined) {
                return nativeObj;
            }
            if (nativeObj instanceof RegExp) {
                var pseudoRegexp = this.createObjectProto(this.REGEXP_PROTO);
                this.populateRegExp(pseudoRegexp, nativeObj);
                return pseudoRegexp;
            }
            if (nativeObj instanceof Function) {
                var interpreter = this;
                var wrapper = function () {
                    return interpreter.nativeToPseudo(nativeObj.apply(interpreter, Array.prototype.slice.call(arguments)
                        .map(function (i) {
                        return interpreter.pseudoToNative(i);
                    })));
                };
                return this.createNativeFunction(wrapper, undefined);
            }
            var pseudoObj;
            if (Array.isArray(nativeObj)) {
                pseudoObj = this.createObjectProto(this.ARRAY_PROTO);
                for (var i = 0; i < nativeObj.length; i++) {
                    if (i in nativeObj) {
                        this.setProperty(pseudoObj, i, this.nativeToPseudo(nativeObj[i]));
                    }
                }
            }
            else {
                pseudoObj = this.createObjectProto(this.OBJECT_PROTO);
                for (var key in nativeObj) {
                    this.setProperty(pseudoObj, key, this.nativeToPseudo(nativeObj[key]));
                }
            }
            return pseudoObj;
        };
        ;
        /**
         * Converts from a JS interpreter object to native JS object.
         * Can handle JSON-style values, plus cycles.
         * @param {Interpreter.MyValue} pseudoObj The JS interpreter object to be
         * converted.
         * @param {Object=} opt_cycles Cycle detection (used in recursive calls).
         * @return {*} The equivalent native JS object or value.
         */
        Interpreter.prototype.pseudoToNative = function (pseudoObj, opt_cycles) {
            if (typeof pseudoObj === 'boolean' ||
                typeof pseudoObj === 'number' ||
                typeof pseudoObj === 'string' ||
                pseudoObj === null || pseudoObj === undefined) {
                return pseudoObj;
            }
            if (this.isa(pseudoObj, this.REGEXP)) {
                return pseudoObj.data;
            }
            var cycles = opt_cycles || {
                pseudo: [],
                native: []
            };
            var i = cycles.pseudo.indexOf(pseudoObj);
            if (i !== -1) {
                return cycles.native[i];
            }
            cycles.pseudo.push(pseudoObj);
            var nativeObj;
            if (this.isa(pseudoObj, this.ARRAY)) {
                nativeObj = [];
                cycles.native.push(nativeObj);
                var length = this.getProperty(pseudoObj, 'length');
                for (var i = 0; i < length; i++) {
                    if (this.hasProperty(pseudoObj, i)) {
                        nativeObj[i] =
                            this.pseudoToNative(this.getProperty(pseudoObj, i), cycles);
                    }
                }
            }
            else {
                nativeObj = {};
                cycles.native.push(nativeObj);
                var val;
                for (var key in pseudoObj.properties) {
                    val = pseudoObj.properties[key];
                    nativeObj[key] = this.pseudoToNative(val, cycles);
                }
            }
            cycles.pseudo.pop();
            cycles.native.pop();
            return nativeObj;
        };
        ;
        /**
         * Look up the prototype for this value.
         * @param {Interpreter.MyValue} value Data object.
         * @return {Interpreter.MyObject} Prototype object, null if none.
         */
        Interpreter.prototype.getPrototype = function (value) {
            switch (typeof value) {
                case 'number':
                    return this.NUMBER.properties['prototype'];
                case 'boolean':
                    return this.BOOLEAN.properties['prototype'];
                case 'string':
                    return this.STRING.properties['prototype'];
            }
            if (value) {
                return value.proto;
            }
            return null;
        };
        ;
        /**
         * Fetch a property value from a data object.
         * @param {Interpreter.MyValue} obj Data object.
         * @param {Interpreter.MyValue} name Name of property.
         * @return {Interpreter.MyValue} Property value (may be undefined).
         */
        Interpreter.prototype.getProperty = function (obj, name) {
            name = String(name);
            if (obj === undefined || obj === null) {
                this.throwException(this.TYPE_ERROR, "Cannot read property '" + name + "' of " + obj);
            }
            if (name === 'length') {
                // Special cases for magic length property.
                if (this.isa(obj, this.STRING)) {
                    return String(obj).length;
                }
            }
            else if (name.charCodeAt(0) < 0x40) {
                // Might have numbers in there?
                // Special cases for string array indexing
                if (this.isa(obj, this.STRING)) {
                    var n = Interpreter.legalArrayIndex(name);
                    if (!isNaN(n) && n < String(obj).length) {
                        return String(obj)[n];
                    }
                }
            }
            do {
                var myObj = obj;
                if (myObj.properties && name in myObj.properties) {
                    var getter = myObj.getter[name];
                    if (getter) {
                        // Flag this function as being a getter and thus needing immediate
                        // execution (rather than being the value of the property).
                        getter.isGetter = true;
                        return getter;
                    }
                    return myObj.properties[name];
                }
            } while ((obj = this.getPrototype(obj)));
            return undefined;
        };
        ;
        /**
         * Does the named property exist on a data object.
         * @param {Interpreter.MyValue} obj Data object.
         * @param {Interpreter.MyValue} name Name of property.
         * @return {boolean} True if property exists.
         */
        Interpreter.prototype.hasProperty = function (obj, name) {
            if (!obj['isObject']) {
                throw TypeError('Primitive data type has no properties');
            }
            name = String(name);
            if (name === 'length' && this.isa(obj, this.STRING)) {
                return true;
            }
            if (this.isa(obj, this.STRING)) {
                var n = Interpreter.legalArrayIndex(name);
                if (!isNaN(n) && n < String(obj).length) {
                    return true;
                }
            }
            do {
                var myObj = obj;
                if (myObj.properties && name in myObj.properties) {
                    return true;
                }
            } while ((obj = this.getPrototype(obj)));
            return false;
        };
        ;
        /**
         * Set a property value on a data object.
         * @param {!Interpreter.MyObject} obj Data object.
         * @param {Interpreter.MyValue} name Name of property.
         * @param {Interpreter.MyValue|ReferenceError} value New property value.
         *   Use ReferenceError if value is handled by descriptor instead.
         * @param {Object=} opt_descriptor Optional descriptor object.
         * @return {!Interpreter.MyObject|undefined} Returns a setter function if one
         *     needs to be called, otherwise undefined.
         */
        Interpreter.prototype.setProperty = function (obj, name, value, opt_descriptor) {
            name = String(name);
            if (obj === undefined || obj === null) {
                this.throwException(this.TYPE_ERROR, "Cannot set property '" + name + "' of " + obj);
            }
            if (opt_descriptor && ('get' in opt_descriptor || 'set' in opt_descriptor) &&
                ('value' in opt_descriptor || 'writable' in opt_descriptor)) {
                this.throwException(this.TYPE_ERROR, 'Invalid property descriptor. ' +
                    'Cannot both specify accessors and a value or writable attribute');
            }
            var strict = !this.stateStack || this.getScope().strict;
            if (!obj.isObject) {
                if (strict) {
                    this.throwException(this.TYPE_ERROR, "Can't create property '" + name +
                        "' on '" + obj + "'");
                }
                return;
            }
            if (this.isa(obj, this.STRING)) {
                var n = Interpreter.legalArrayIndex(name);
                if (name === 'length' || (!isNaN(n) && n < String(obj).length)) {
                    // Can't set length or letters on String objects.
                    if (strict) {
                        this.throwException(this.TYPE_ERROR, "Cannot assign to read only " +
                            "property '" + name + "' of String '" + obj.data + "'");
                    }
                    return;
                }
            }
            if (obj.class === 'Array') {
                // Arrays have a magic length variable that is bound to the elements.
                var length = obj.properties.length;
                var i;
                if (name === 'length') {
                    // Delete elements if length is smaller.
                    value = Interpreter.legalArrayLength(value);
                    if (isNaN(value)) {
                        this.throwException(this.RANGE_ERROR, 'Invalid array length');
                    }
                    if (value < length) {
                        for (i in obj.properties) {
                            i = Interpreter.legalArrayIndex(i);
                            if (!isNaN(i) && value <= i) {
                                delete obj.properties[i];
                            }
                        }
                    }
                }
                else if (!isNaN(i = Interpreter.legalArrayIndex(name))) {
                    // Increase length if this index is larger.
                    obj.properties.length = Math.max(length, i + 1);
                }
            }
            if (obj.preventExtensions && !(name in obj.properties)) {
                if (strict) {
                    this.throwException(this.TYPE_ERROR, "Can't add property '" + name +
                        "', object is not extensible");
                }
                return;
            }
            if (opt_descriptor) {
                // Define the property.
                if ('get' in opt_descriptor) {
                    if (opt_descriptor.get) {
                        obj.getter[name] = opt_descriptor.get;
                    }
                    else {
                        delete obj.getter[name];
                    }
                }
                if ('set' in opt_descriptor) {
                    if (opt_descriptor.set) {
                        obj.setter[name] = opt_descriptor.set;
                    }
                    else {
                        delete obj.setter[name];
                    }
                }
                var descriptor = {};
                if ('configurable' in opt_descriptor) {
                    descriptor.configurable = opt_descriptor.configurable;
                }
                if ('enumerable' in opt_descriptor) {
                    descriptor.enumerable = opt_descriptor.enumerable;
                }
                if ('writable' in opt_descriptor) {
                    descriptor.writable = opt_descriptor.writable;
                    delete obj.getter[name];
                    delete obj.setter[name];
                }
                if ('value' in opt_descriptor) {
                    descriptor.value = opt_descriptor.value;
                    delete obj.getter[name];
                    delete obj.setter[name];
                }
                else if (value !== ReferenceError) {
                    descriptor.value = value;
                    delete obj.getter[name];
                    delete obj.setter[name];
                }
                try {
                    Object.defineProperty(obj.properties, name, descriptor);
                }
                catch (e) {
                    this.throwException(this.TYPE_ERROR, 'Cannot redefine property: ' + name);
                }
            }
            else {
                // Set the property.
                if (value === ReferenceError) {
                    throw ReferenceError('Value not specified.');
                }
                // Determine the parent (possibly self) where the property is defined.
                var defObj = obj;
                while (!(name in defObj.properties)) {
                    defObj = this.getPrototype(defObj);
                    if (!defObj) {
                        // This is a new property.
                        defObj = obj;
                        break;
                    }
                }
                if (defObj.setter && defObj.setter[name]) {
                    return defObj.setter[name];
                }
                if (defObj.getter && defObj.getter[name]) {
                    if (strict) {
                        this.throwException(this.TYPE_ERROR, "Cannot set property '" + name +
                            "' of object '" + obj + "' which only has a getter");
                    }
                }
                else {
                    // No setter, simple assignment.
                    try {
                        obj.properties[name] = value;
                    }
                    catch (e) {
                        if (strict) {
                            this.throwException(this.TYPE_ERROR, "Cannot assign to read only " +
                                "property '" + name + "' of object '" + obj + "'");
                        }
                    }
                }
            }
        };
        ;
        /**
         * Convenience method for adding a native function as a non-enumerable property
         * onto an object's prototype.
         * @param {!Interpreter.MyObject} obj Data object.
         * @param {Interpreter.MyValue} name Name of property.
         * @param {!Function} wrapper Function object.
         */
        Interpreter.prototype.setNativeFunctionPrototype = function (obj, name, wrapper) {
            this.setProperty(obj.properties['prototype'], name, this.createNativeFunction(wrapper, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
        };
        ;
        /**
         * Returns the current scope from the stateStack.
         * @return {!Interpreter.MyObject} Current scope dictionary.
         */
        Interpreter.prototype.getScope = function () {
            var scope = this.stateStack[this.stateStack.length - 1].scope;
            if (!scope) {
                throw Error('No scope found.');
            }
            return scope;
        };
        ;
        /**
         * Create a new scope dictionary.
         * @param {!Object} node AST node defining the scope container
         *     (e.g. a function).
         * @param {Interpreter.MyObject} parentScope Scope to link to.
         * @return {!Interpreter.MyObject} New scope.
         */
        Interpreter.prototype.createScope = function (node, parentScope) {
            var scope = this.createObjectProto(null);
            scope.parentScope = parentScope;
            if (!parentScope) {
                this.initGlobalScope(scope);
            }
            this.populateScope_(node, scope);
            // Determine if this scope starts with 'use strict'.
            scope.strict = false;
            if (parentScope && parentScope.strict) {
                scope.strict = true;
            }
            else {
                var firstNode = node['body'] && node['body'][0];
                if (firstNode && firstNode.expression &&
                    firstNode.expression['type'] === 'Literal' &&
                    firstNode.expression.value === 'use strict') {
                    scope.strict = true;
                }
            }
            return scope;
        };
        ;
        /**
         * Create a new special scope dictionary. Similar to createScope(), but
         * doesn't assume that the scope is for a function body.
         * This is used for 'catch' clauses and 'with' statements.
         * @param {!Interpreter.MyObject} parentScope Scope to link to.
         * @param {Interpreter.MyObject=} opt_scope Optional object to transform into
         *     scope.
         * @return {!Interpreter.MyObject} New scope.
         */
        Interpreter.prototype.createSpecialScope = function (parentScope, opt_scope) {
            if (!parentScope) {
                throw Error('parentScope required');
            }
            var scope = opt_scope || this.createObjectProto(null);
            scope.parentScope = parentScope;
            scope.strict = parentScope.strict;
            return scope;
        };
        ;
        /**
         * Retrieves a value from the scope chain.
         * @param {string} name Name of variable.
         * @return {Interpreter.MyValue} Any value.
         *   May be flagged as being a getter and thus needing immediate execution
         *   (rather than being the value of the property).
         */
        Interpreter.prototype.getValueFromScope = function (name) {
            var scope = this.getScope();
            while (scope && scope !== this.global) {
                if (name in scope.properties) {
                    return scope.properties[name];
                }
                scope = scope.parentScope;
            }
            // The root scope is also an object which has inherited properties and
            // could also have getters.
            if (scope === this.global && this.hasProperty(scope, name)) {
                return this.getProperty(scope, name);
            }
            // Typeof operator is unique: it can safely look at non-defined variables.
            var prevNode = this.stateStack[this.stateStack.length - 1].node;
            if (prevNode['type'] === 'UnaryExpression' &&
                prevNode['operator'] === 'typeof') {
                return undefined;
            }
            this.throwException(this.REFERENCE_ERROR, name + ' is not defined');
        };
        ;
        /**
         * Sets a value to the current scope.
         * @param {string} name Name of variable.
         * @param {Interpreter.MyValue} value Value.
         * @return {!Interpreter.MyObject|undefined} Returns a setter function if one
         *     needs to be called, otherwise undefined.
         */
        Interpreter.prototype.setValueToScope = function (name, value) {
            var scope = this.getScope();
            var strict = scope.strict;
            while (scope && scope !== this.global) {
                if (name in scope.properties) {
                    scope.properties[name] = value;
                    return undefined;
                }
                scope = scope.parentScope;
            }
            // The root scope is also an object which has readonly properties and
            // could also have setters.
            if (scope === this.global && (!strict || this.hasProperty(scope, name))) {
                return this.setProperty(scope, name, value);
            }
            this.throwException(this.REFERENCE_ERROR, name + ' is not defined');
        };
        ;
        /**
         * Create a new scope for the given node.
         * @param {!Object} node AST node (program or function).
         * @param {!Interpreter.MyObject} scope Scope dictionary to populate.
         * @private
         */
        Interpreter.prototype.populateScope_ = function (node, scope) {
            if (node['type'] === 'VariableDeclaration') {
                for (var i = 0; i < node['declarations'].length; i++) {
                    this.setProperty(scope, node['declarations'][i]['id']['name'], undefined, Interpreter.VARIABLE_DESCRIPTOR);
                }
            }
            else if (node['type'] === 'FunctionDeclaration') {
                this.setProperty(scope, node['id']['name'], this.createFunction(node, scope), Interpreter.VARIABLE_DESCRIPTOR);
                return; // Do not recurse into function.
            }
            else if (node['type'] === 'FunctionExpression') {
                return; // Do not recurse into function.
            }
            else if (node['type'] === 'ExpressionStatement') {
                return; // Expressions can't contain variable/function declarations.
            }
            var nodeClass = node['constructor'];
            for (var name in node) {
                var prop = node[name];
                if (prop && typeof prop === 'object') {
                    if (Array.isArray(prop)) {
                        for (var i = 0; i < prop.length; i++) {
                            if (prop[i] && prop[i].constructor === nodeClass) {
                                this.populateScope_(prop[i], scope);
                            }
                        }
                    }
                    else {
                        if (prop.constructor === nodeClass) {
                            this.populateScope_(prop, scope);
                        }
                    }
                }
            }
        };
        ;
        /**
         * Remove start and end values from AST, or set start and end values to a
         * constant value.  Used to remove highlighting from polyfills and to set
         * highlighting in an eval to cover the entire eval expression.
         * @param {!Object} node AST node.
         * @param {number=} start Starting character of all nodes, or undefined.
         * @param {number=} end Ending character of all nodes, or undefined.
         * @private
         */
        Interpreter.prototype.stripLocations_ = function (node, start, end) {
            if (start) {
                node['start'] = start;
            }
            else {
                delete node['start'];
            }
            if (end) {
                node['end'] = end;
            }
            else {
                delete node['end'];
            }
            for (var name in node) {
                if (node.hasOwnProperty(name)) {
                    var prop = node[name];
                    if (prop && typeof prop === 'object') {
                        this.stripLocations_(prop, start, end);
                    }
                }
            }
        };
        ;
        /**
         * Is the current state directly being called with as a construction with 'new'.
         * @return {boolean} True if 'new foo()', false if 'foo()'.
         */
        Interpreter.prototype.calledWithNew = function () {
            return this.stateStack[this.stateStack.length - 1].isConstructor;
        };
        ;
        /**
         * Gets a value from the scope chain or from an object property.
         * @param {!Array} ref Name of variable or object/propname tuple.
         * @return {Interpreter.MyValue} Any value.
         *   May be flagged as being a getter and thus needing immediate execution
         *   (rather than being the value of the property).
         */
        Interpreter.prototype.getValue = function (ref) {
            if (ref[0] === Interpreter.SCOPE_REFERENCE) {
                // A null/varname variable lookup.
                return this.getValueFromScope(ref[1]);
            }
            else {
                // An obj/prop components tuple (foo.bar).
                return this.getProperty(ref[0], ref[1]);
            }
        };
        ;
        /**
         * Sets a value to the scope chain or to an object property.
         * @param {!Array} ref Name of variable or object/propname tuple.
         * @param {Interpreter.MyValue} value Value.
         * @return {!Interpreter.MyObject|undefined} Returns a setter function if one
         *     needs to be called, otherwise undefined.
         */
        Interpreter.prototype.setValue = function (ref, value) {
            if (ref[0] === Interpreter.SCOPE_REFERENCE) {
                // A null/varname variable lookup.
                return this.setValueToScope(ref[1], value);
            }
            else {
                // An obj/prop components tuple (foo.bar).
                return this.setProperty(ref[0], ref[1], value);
            }
        };
        ;
        /**
         * Throw an exception in the interpreter that can be handled by an
         * interpreter try/catch statement.  If unhandled, a real exception will
         * be thrown.  Can be called with either an error class and a message, or
         * with an actual object to be thrown.
         * @param {!Interpreter.MyObject} errorClass Type of error (if message is
         *   provided) or the value to throw (if no message).
         * @param {string=} opt_message Message being thrown.
         */
        Interpreter.prototype.throwException = function (errorClass, opt_message) {
            if (opt_message === undefined) {
                var error = errorClass; // This is a value to throw, not an error class.
            }
            else {
                var error = this.createObject(errorClass);
                this.setProperty(error, 'message', opt_message, Interpreter.NONENUMERABLE_DESCRIPTOR);
            }
            this.executeException(error);
            // Abort anything related to the current step.
            throw Interpreter.STEP_ERROR;
        };
        ;
        /**
         * Throw an exception in the interpreter that can be handled by a
         * interpreter try/catch statement.  If unhandled, a real exception will
         * be thrown.
         * @param {!Interpreter.MyObject} error Error object to execute.
         */
        Interpreter.prototype.executeException = function (error) {
            // Search for a try statement.
            do {
                this.stateStack.pop();
                var state = this.stateStack[this.stateStack.length - 1];
                if (state.node['type'] === 'TryStatement') {
                    state.throwValue = error;
                    return;
                }
            } while (state && state.node['type'] !== 'Program');
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
            }
            else {
                realError = error.toString();
            }
            throw realError;
        };
        ;
        /**
         * Create a call to a getter function.
         * @param {!Interpreter.MyObject} func Function to execute.
         * @param {!Interpreter.MyObject|!Array} left
         *     Name of variable or object/propname tuple.
         * @private
         */
        Interpreter.prototype.createGetter_ = function (func, left) {
            // Normally 'this' will be specified as the object component (o.x).
            // Sometimes 'this' is explicitly provided (o).
            var funcThis = Array.isArray(left) ? left[0] : left;
            var node = new this.nodeConstructor();
            node['type'] = 'CallExpression';
            var state = new Interpreter.MyState(node, this.stateStack[this.stateStack.length - 1].scope);
            state.doneCallee_ = true;
            state.funcThis_ = funcThis;
            state.func_ = func;
            state.doneArgs_ = true;
            state.arguments_ = [];
            return state;
        };
        ;
        /**
         * Create a call to a setter function.
         * @param {!Interpreter.MyObject} func Function to execute.
         * @param {!Interpreter.MyObject|!Array} left
         *     Name of variable or object/propname tuple.
         * @param {Interpreter.MyValue} value Value to set.
         * @private
         */
        Interpreter.prototype.createSetter_ = function (func, left, value) {
            // Normally 'this' will be specified as the object component (o.x).
            // Sometimes 'this' is implicitly the global object (x).
            var funcThis = Array.isArray(left) ? left[0] : this.global;
            var node = new this.nodeConstructor();
            node['type'] = 'CallExpression';
            var state = new Interpreter.MyState(node, this.stateStack[this.stateStack.length - 1].scope);
            state.doneCallee_ = true;
            state.funcThis_ = funcThis;
            state.func_ = func;
            state.doneArgs_ = true;
            state.arguments_ = [value];
            return state;
        };
        ;
        ///////////////////////////////////////////////////////////////////////////////
        // Functions to handle each node type.
        ///////////////////////////////////////////////////////////////////////////////
        Interpreter.prototype.stepArrayExpression = function (stack, state, node) {
            var elements = node['elements'];
            var n = state.n_ || 0;
            if (!state.array_) {
                state.array_ = this.createObjectProto(this.ARRAY_PROTO);
                state.array_.properties.length = elements.length;
            }
            else {
                this.setProperty(state.array_, n, state.value);
                n++;
            }
            while (n < elements.length) {
                // Skip missing elements - they're not defined, not undefined.
                if (elements[n]) {
                    state.n_ = n;
                    return new Interpreter.MyState(elements[n], state.scope);
                }
                n++;
            }
            stack.pop();
            stack[stack.length - 1].value = state.array_;
        };
        ;
        Interpreter.prototype.stepAssignmentExpression = function (stack, state, node) {
            if (!state.doneLeft_) {
                state.doneLeft_ = true;
                var nextState = new Interpreter.MyState(node['left'], state.scope);
                nextState.components = true;
                return nextState;
            }
            if (!state.doneRight_) {
                if (!state.leftReference_) {
                    state.leftReference_ = state.value;
                }
                if (state.doneGetter_) {
                    state.leftValue_ = state.value;
                }
                if (!state.doneGetter_ && node['operator'] !== '=') {
                    var leftValue = this.getValue(state.leftReference_);
                    state.leftValue_ = leftValue;
                    if (leftValue && typeof leftValue === 'object' && leftValue.isGetter) {
                        // Clear the getter flag and call the getter function.
                        leftValue.isGetter = false;
                        state.doneGetter_ = true;
                        var func = (leftValue);
                        return this.createGetter_(func, state.leftReference_);
                    }
                }
                state.doneRight_ = true;
                return new Interpreter.MyState(node['right'], state.scope);
            }
            if (state.doneSetter_) {
                // Return if setter function.
                // Setter method on property has completed.
                // Ignore its return value, and use the original set value instead.
                stack.pop();
                stack[stack.length - 1].value = state.doneSetter_;
                return;
            }
            var value = state.leftValue_;
            var rightValue = state.value;
            switch (node['operator']) {
                case '=':
                    value = rightValue;
                    break;
                case '+=':
                    value += rightValue;
                    break;
                case '-=':
                    value -= rightValue;
                    break;
                case '*=':
                    value *= rightValue;
                    break;
                case '/=':
                    value /= rightValue;
                    break;
                case '%=':
                    value %= rightValue;
                    break;
                case '<<=':
                    value <<= rightValue;
                    break;
                case '>>=':
                    value >>= rightValue;
                    break;
                case '>>>=':
                    value >>>= rightValue;
                    break;
                case '&=':
                    value &= rightValue;
                    break;
                case '^=':
                    value ^= rightValue;
                    break;
                case '|=':
                    value |= rightValue;
                    break;
                default:
                    throw SyntaxError('Unknown assignment expression: ' + node['operator']);
            }
            var setter = this.setValue(state.leftReference_, value);
            if (setter) {
                state.doneSetter_ = value;
                return this.createSetter_(setter, state.leftReference_, value);
            }
            // Return if no setter function.
            stack.pop();
            stack[stack.length - 1].value = value;
        };
        ;
        Interpreter.prototype.stepBinaryExpression = function (stack, state, node) {
            if (!state.doneLeft_) {
                state.doneLeft_ = true;
                return new Interpreter.MyState(node['left'], state.scope);
            }
            if (!state.doneRight_) {
                state.doneRight_ = true;
                state.leftValue_ = state.value;
                return new Interpreter.MyState(node['right'], state.scope);
            }
            stack.pop();
            var leftValue = state.leftValue_;
            var rightValue = state.value;
            var value;
            switch (node['operator']) {
                case '==':
                    value = leftValue == rightValue;
                    break;
                case '!=':
                    value = leftValue != rightValue;
                    break;
                case '===':
                    value = leftValue === rightValue;
                    break;
                case '!==':
                    value = leftValue !== rightValue;
                    break;
                case '>':
                    value = leftValue > rightValue;
                    break;
                case '>=':
                    value = leftValue >= rightValue;
                    break;
                case '<':
                    value = leftValue < rightValue;
                    break;
                case '<=':
                    value = leftValue <= rightValue;
                    break;
                case '+':
                    value = leftValue + rightValue;
                    break;
                case '-':
                    value = leftValue - rightValue;
                    break;
                case '*':
                    value = leftValue * rightValue;
                    break;
                case '/':
                    value = leftValue / rightValue;
                    break;
                case '%':
                    value = leftValue % rightValue;
                    break;
                case '&':
                    value = leftValue & rightValue;
                    break;
                case '|':
                    value = leftValue | rightValue;
                    break;
                case '^':
                    value = leftValue ^ rightValue;
                    break;
                case '<<':
                    value = leftValue << rightValue;
                    break;
                case '>>':
                    value = leftValue >> rightValue;
                    break;
                case '>>>':
                    value = leftValue >>> rightValue;
                    break;
                case 'in':
                    if (!rightValue || !rightValue.isObject) {
                        this.throwException(this.TYPE_ERROR, "'in' expects an object, not '" + rightValue + "'");
                    }
                    value = this.hasProperty(rightValue, leftValue);
                    break;
                case 'instanceof':
                    if (!this.isa(rightValue, this.FUNCTION)) {
                        this.throwException(this.TYPE_ERROR, 'Right-hand side of instanceof is not an object');
                    }
                    value = leftValue.isObject ? this.isa(leftValue, rightValue) : false;
                    break;
                default:
                    throw SyntaxError('Unknown binary operator: ' + node['operator']);
            }
            stack[stack.length - 1].value = value;
        };
        ;
        Interpreter.prototype.stepBlockStatement = function (stack, state, node) {
            var n = state.n_ || 0;
            var expression = node['body'][n];
            if (expression) {
                state.n_ = n + 1;
                return new Interpreter.MyState(expression, state.scope);
            }
            stack.pop();
        };
        ;
        Interpreter.prototype.stepBreakStatement = function (stack, state, node) {
            stack.pop();
            var label = null;
            if (node['label']) {
                label = node['label']['name'];
            }
            while (state &&
                state.node['type'] !== 'CallExpression' &&
                state.node['type'] !== 'NewExpression') {
                if (label) {
                    if (state.labels && state.labels.indexOf(label) !== -1) {
                        return;
                    }
                }
                else if (state.isLoop || state.isSwitch) {
                    return;
                }
                state = stack.pop();
            }
            // Syntax error, do not allow this error to be trapped.
            throw SyntaxError('Illegal break statement');
        };
        ;
        Interpreter.prototype.stepCallExpression = function (stack, state, node) {
            if (!state.doneCallee_) {
                state.doneCallee_ = 1;
                // Components needed to determine value of 'this'.
                var nextState = new Interpreter.MyState(node['callee'], state.scope);
                nextState.components = true;
                return nextState;
            }
            if (state.doneCallee_ === 1) {
                // Determine value of the function.
                state.doneCallee_ = 2;
                var func = state.value;
                if (Array.isArray(func)) {
                    state.func_ = this.getValue(func);
                    if (func[0] !== Interpreter.SCOPE_REFERENCE) {
                        // Method function, 'this' is object (ignored if invoked as 'new').
                        state.funcThis_ = func[0];
                    }
                    func = state.func_;
                    if (func && typeof func === 'object' && func.isGetter) {
                        // Clear the getter flag and call the getter function.
                        func.isGetter = false;
                        state.doneCallee_ = 1;
                        return this.createGetter_(/** @type {!Interpreter.Object} */ (func), state.value);
                    }
                }
                else {
                    // Already evaluated function: (function(){...})();
                    state.func_ = func;
                }
                state.arguments_ = [];
                state.n_ = 0;
            }
            var func = state.func_;
            if (!state.doneArgs_) {
                if (state.n_ !== 0) {
                    state.arguments_.push(state.value);
                }
                if (node['arguments'][state.n_]) {
                    return new Interpreter.MyState(node['arguments'][state.n_++], state.scope);
                }
                // Determine value of 'this' in function.
                if (node['type'] === 'NewExpression') {
                    if (func.illegalConstructor) {
                        // Illegal: new escape();
                        this.throwException(this.TYPE_ERROR, func + ' is not a constructor');
                    }
                    // Constructor, 'this' is new object.
                    state.funcThis_ = this.createObject(func);
                    state.isConstructor = true;
                }
                else if (state.funcThis_ === undefined) {
                    // Global function, 'this' is global object (or 'undefined' if strict).
                    state.funcThis_ = state.scope.strict ? undefined : this.global;
                }
                state.doneArgs_ = true;
            }
            if (!state.doneExec_) {
                state.doneExec_ = true;
                if (!func || !func.isObject) {
                    this.throwException(this.TYPE_ERROR, func + ' is not a function');
                }
                var funcNode = func.node;
                if (funcNode) {
                    var scope = this.createScope(funcNode['body'], func.parentScope);
                    // Add all arguments.
                    for (var i = 0; i < funcNode['params'].length; i++) {
                        var paramName = funcNode['params'][i]['name'];
                        var paramValue = state.arguments_.length > i ? state.arguments_[i] :
                            undefined;
                        this.setProperty(scope, paramName, paramValue);
                    }
                    // Build arguments variable.
                    var argsList = this.createObjectProto(this.ARRAY_PROTO);
                    for (var i = 0; i < state.arguments_.length; i++) {
                        this.setProperty(argsList, i, state.arguments_[i]);
                    }
                    this.setProperty(scope, 'arguments', argsList);
                    // Add the function's name (var x = function foo(){};)
                    var name = funcNode['id'] && funcNode['id']['name'];
                    if (name) {
                        this.setProperty(scope, name, func);
                    }
                    this.setProperty(scope, 'this', state.funcThis_, Interpreter.READONLY_DESCRIPTOR);
                    state.value = undefined; // Default value if no explicit return.
                    return new Interpreter.MyState(funcNode['body'], scope);
                }
                else if (func.eval) {
                    var code = state.arguments_[0];
                    if (typeof code !== 'string') {
                        // JS does not parse String objects:
                        // eval(new String('1 + 1')) -> '1 + 1'
                        state.value = code;
                    }
                    else {
                        try {
                            var ast = acorn.parse(code.toString(), Interpreter.PARSE_OPTIONS);
                        }
                        catch (e) {
                            // Acorn threw a SyntaxError.  Rethrow as a trappable error.
                            this.throwException(this.SYNTAX_ERROR, 'Invalid code: ' + e.message);
                        }
                        var evalNode = new this.nodeConstructor();
                        evalNode['type'] = 'EvalProgram_';
                        evalNode['body'] = ast['body'];
                        this.stripLocations_(evalNode, node['start'], node['end']);
                        // Update current scope with definitions in eval().
                        var scope = state.scope;
                        if (scope.strict) {
                            // Strict mode get its own scope in eval.
                            scope = this.createScope(ast, scope);
                        }
                        else {
                            // Non-strict mode pollutes the current scope.
                            this.populateScope_(ast, scope);
                        }
                        this.value = undefined; // Default value if no code.
                        return new Interpreter.MyState(evalNode, scope);
                    }
                }
                else if (func.nativeFunc) {
                    state.value = func.nativeFunc.apply(state.funcThis_, state.arguments_);
                }
                else if (func.asyncFunc) {
                    var thisInterpreter = this;
                    var callback = function (value) {
                        state.value = value;
                        thisInterpreter.paused_ = false;
                    };
                    var argsWithCallback = state.arguments_.concat(callback);
                    this.paused_ = true;
                    func.asyncFunc.apply(state.funcThis_, argsWithCallback);
                    return;
                }
                else {
                    /* A child of a function is a function but is not callable.  For example:
                    var F = function() {};
                    F.prototype = escape;
                    var f = new F();
                    f();
                    */
                    this.throwException(this.TYPE_ERROR, func.class + ' is not a function');
                }
            }
            else {
                // Execution complete.  Put the return value on the stack.
                stack.pop();
                if (state.isConstructor && typeof state.value !== 'object') {
                    stack[stack.length - 1].value = state.funcThis_;
                }
                else {
                    stack[stack.length - 1].value = state.value;
                }
            }
        };
        ;
        Interpreter.prototype.stepCatchClause = function (stack, state, node) {
            if (!state.done_) {
                state.done_ = true;
                // Create an empty scope.
                var scope = this.createSpecialScope(state.scope);
                // Add the argument.
                this.setProperty(scope, node['param']['name'], state.throwValue);
                // Execute catch clause.
                return new Interpreter.MyState(node['body'], scope);
            }
            else {
                stack.pop();
            }
        };
        ;
        Interpreter.prototype.stepConditionalExpression = function (stack, state, node) {
            var mode = state.mode_ || 0;
            if (mode === 0) {
                state.mode_ = 1;
                return new Interpreter.MyState(node['test'], state.scope);
            }
            if (mode === 1) {
                state.mode_ = 2;
                var value = Boolean(state.value);
                if (value && node['consequent']) {
                    // Execute 'if' block.
                    return new Interpreter.MyState(node['consequent'], state.scope);
                }
                else if (!value && node['alternate']) {
                    // Execute 'else' block.
                    return new Interpreter.MyState(node['alternate'], state.scope);
                }
                // eval('1;if(false){2}') -> undefined
                this.value = undefined;
            }
            stack.pop();
            if (node['type'] === 'ConditionalExpression') {
                stack[stack.length - 1].value = state.value;
            }
        };
        ;
        Interpreter.prototype.stepContinueStatement = function (stack, state, node) {
            stack.pop();
            var label = null;
            if (node['label']) {
                label = node['label']['name'];
            }
            state = stack[stack.length - 1];
            while (state &&
                state.node['type'] !== 'CallExpression' &&
                state.node['type'] !== 'NewExpression') {
                if (state.isLoop) {
                    if (!label || (state.labels && state.labels.indexOf(label) !== -1)) {
                        return;
                    }
                }
                stack.pop();
                state = stack[stack.length - 1];
            }
            // Syntax error, do not allow this error to be trapped.
            throw SyntaxError('Illegal continue statement');
        };
        ;
        Interpreter.prototype.stepDebuggerStatement = function (stack, state, node) {
            // Do nothing.  May be overridden by developers.
            stack.pop();
        };
        ;
        Interpreter.prototype.stepDoWhileStatement = function (stack, state, node) {
            if (node['type'] === 'DoWhileStatement' && state.test_ === undefined) {
                // First iteration of do/while executes without checking test.
                state.value = true;
                state.test_ = true;
            }
            if (!state.test_) {
                state.test_ = true;
                return new Interpreter.MyState(node['test'], state.scope);
            }
            if (!state.value) {
                stack.pop();
            }
            else if (node['body']) {
                state.test_ = false;
                state.isLoop = true;
                return new Interpreter.MyState(node['body'], state.scope);
            }
        };
        ;
        Interpreter.prototype.stepEmptyStatement = function (stack, state, node) {
            stack.pop();
        };
        ;
        Interpreter.prototype.stepEvalProgram_ = function (stack, state, node) {
            var n = state.n_ || 0;
            var expression = node['body'][n];
            if (expression) {
                state.n_ = n + 1;
                return new Interpreter.MyState(expression, state.scope);
            }
            stack.pop();
            stack[stack.length - 1].value = this.value;
        };
        ;
        Interpreter.prototype.stepExpressionStatement = function (stack, state, node) {
            if (!state.done_) {
                state.done_ = true;
                return new Interpreter.MyState(node['expression'], state.scope);
            }
            stack.pop();
            // Save this value to interpreter.value for use as a return value if
            // this code is inside an eval function.
            this.value = state.value;
        };
        ;
        Interpreter.prototype.stepForInStatement = function (stack, state, node) {
            // First, initialize a variable if exists.  Only do so once, ever.
            if (!state.doneInit_) {
                state.doneInit_ = true;
                if (node['left']['declarations'] &&
                    node['left']['declarations'][0]['init']) {
                    if (state.scope.strict) {
                        this.throwException(this.SYNTAX_ERROR, 'for-in loop variable declaration may not have an initializer.');
                    }
                    // Variable initialization: for (var x = 4 in y)
                    return new Interpreter.MyState(node['left'], state.scope);
                }
            }
            // Second, look up the object.  Only do so once, ever.
            if (!state.doneObject_) {
                state.doneObject_ = true;
                if (!state.variable_) {
                    state.variable_ = state.value;
                }
                return new Interpreter.MyState(node['right'], state.scope);
            }
            if (!state.isLoop) {
                // First iteration.
                state.isLoop = true;
                state.object_ = state.value;
                state.visited_ = Object.create(null);
            }
            // Third, find the property name for this iteration.
            if (state.name_ === undefined) {
                done: do {
                    if (state.object_ && state.object_.isObject) {
                        if (!state.props_) {
                            state.props_ = Object.getOwnPropertyNames(state.object_.properties);
                        }
                        do {
                            var prop = state.props_.shift();
                        } while (prop && (state.visited_[prop] ||
                            !Object.prototype.hasOwnProperty.call(state.object_.properties, prop)));
                        if (prop) {
                            state.visited_[prop] = true;
                            if (Object.prototype.propertyIsEnumerable.call(state.object_.properties, prop)) {
                                state.name_ = prop;
                                break done;
                            }
                        }
                    }
                    else if (state.object_ !== null) {
                        if (!state.props_) {
                            state.props_ = Object.getOwnPropertyNames(state.object_);
                        }
                        do {
                            var prop = state.props_.shift();
                        } while (prop && state.visited_[prop]);
                        if (prop) {
                            state.visited_[prop] = true;
                            state.name_ = prop;
                            break done;
                        }
                    }
                    state.object_ = this.getPrototype(state.object_);
                    state.props_ = null;
                } while (state.object_ !== null);
                if (state.object_ === null) {
                    // Done, exit loop.
                    stack.pop();
                    return;
                }
            }
            // Fourth, find the variable
            if (!state.doneVariable_) {
                state.doneVariable_ = true;
                var left = node['left'];
                if (left['type'] === 'VariableDeclaration') {
                    // Inline variable declaration: for (var x in y)
                    state.variable_ =
                        [Interpreter.SCOPE_REFERENCE, left['declarations'][0]['id']['name']];
                }
                else {
                    // Arbitrary left side: for (foo().bar in y)
                    state.variable_ = null;
                    var nextState = new Interpreter.MyState(left, state.scope);
                    nextState.components = true;
                    return nextState;
                }
            }
            if (!state.variable_) {
                state.variable_ = state.value;
            }
            // Fifth, set the variable.
            if (!state.doneSetter_) {
                state.doneSetter_ = true;
                var value = state.name_;
                var setter = this.setValue(state.variable_, value);
                if (setter) {
                    return this.createSetter_(setter, state.variable_, value);
                }
            }
            // Next step will be step three.
            state.name_ = undefined;
            // Reevaluate the variable since it could be a setter on the global object.
            state.doneVariable_ = false;
            state.doneSetter_ = false;
            // Sixth and finally, execute the body if there was one.  this.
            if (node['body']) {
                return new Interpreter.MyState(node['body'], state.scope);
            }
        };
        ;
        Interpreter.prototype.stepForStatement = function (stack, state, node) {
            var mode = state.mode_ || 0;
            if (mode === 0) {
                state.mode_ = 1;
                if (node['init']) {
                    return new Interpreter.MyState(node['init'], state.scope);
                }
            }
            else if (mode === 1) {
                state.mode_ = 2;
                if (node['test']) {
                    return new Interpreter.MyState(node['test'], state.scope);
                }
            }
            else if (mode === 2) {
                state.mode_ = 3;
                if (node['test'] && !state.value) {
                    // Done, exit loop.
                    stack.pop();
                }
                else {
                    state.isLoop = true;
                    return new Interpreter.MyState(node['body'], state.scope);
                }
            }
            else if (mode === 3) {
                state.mode_ = 1;
                if (node['update']) {
                    return new Interpreter.MyState(node['update'], state.scope);
                }
            }
        };
        ;
        Interpreter.prototype.stepFunctionDeclaration = function (stack, state, node) {
            // This was found and handled when the scope was populated.
            stack.pop();
        };
        ;
        Interpreter.prototype.stepFunctionExpression = function (stack, state, node) {
            stack.pop();
            stack[stack.length - 1].value = this.createFunction(node, state.scope);
        };
        ;
        Interpreter.prototype.stepIdentifier = function (stack, state, node) {
            stack.pop();
            if (state.components) {
                stack[stack.length - 1].value = [Interpreter.SCOPE_REFERENCE, node['name']];
                return;
            }
            var value = this.getValueFromScope(node['name']);
            // An identifier could be a getter if it's a property on the global object.
            if (value && typeof value === 'object' && value.isGetter) {
                // Clear the getter flag and call the getter function.
                value.isGetter = false;
                var scope = state.scope;
                while (!this.hasProperty(scope, node['name'])) {
                    scope = scope.parentScope;
                }
                var func = (value);
                return this.createGetter_(func, this.global);
            }
            stack[stack.length - 1].value = value;
        };
        ;
        Interpreter.prototype.stepIfStatement = function (stack, state, node) {
            return this.stepConditionalExpression(stack, state, node);
        };
        Interpreter.prototype.stepLabeledStatement = function (stack, state, node) {
            // No need to hit this node again on the way back up the stack.
            stack.pop();
            // Note that a statement might have multiple labels.
            var labels = state.labels || [];
            labels.push(node['label']['name']);
            var nextState = new Interpreter.MyState(node['body'], state.scope);
            nextState.labels = labels;
            return nextState;
        };
        ;
        Interpreter.prototype.stepLiteral = function (stack, state, node) {
            stack.pop();
            var value = node['value'];
            if (value instanceof RegExp) {
                var pseudoRegexp = this.createObjectProto(this.REGEXP_PROTO);
                this.populateRegExp(pseudoRegexp, value);
                value = pseudoRegexp;
            }
            stack[stack.length - 1].value = value;
        };
        ;
        Interpreter.prototype.stepLogicalExpression = function (stack, state, node) {
            if (node['operator'] !== '&&' && node['operator'] !== '||') {
                throw SyntaxError('Unknown logical operator: ' + node['operator']);
            }
            if (!state.doneLeft_) {
                state.doneLeft_ = true;
                return new Interpreter.MyState(node['left'], state.scope);
            }
            if (!state.doneRight_) {
                if ((node['operator'] === '&&' && !state.value) ||
                    (node['operator'] === '||' && state.value)) {
                    // Shortcut evaluation.
                    stack.pop();
                    stack[stack.length - 1].value = state.value;
                }
                else {
                    state.doneRight_ = true;
                    return new Interpreter.MyState(node['right'], state.scope);
                }
            }
            else {
                stack.pop();
                stack[stack.length - 1].value = state.value;
            }
        };
        ;
        Interpreter.prototype.stepMemberExpression = function (stack, state, node) {
            if (!state.doneObject_) {
                state.doneObject_ = true;
                return new Interpreter.MyState(node['object'], state.scope);
            }
            var propName;
            if (!node['computed']) {
                state.object_ = state.value;
                // obj.foo -- Just access 'foo' directly.
                propName = node['property']['name'];
            }
            else if (!state.doneProperty_) {
                state.object_ = state.value;
                // obj[foo] -- Compute value of 'foo'.
                state.doneProperty_ = true;
                return new Interpreter.MyState(node['property'], state.scope);
            }
            else {
                propName = state.value;
            }
            stack.pop();
            if (state.components) {
                stack[stack.length - 1].value = [state.object_, propName];
            }
            else {
                var value = this.getProperty(state.object_, propName);
                if (value && typeof value === 'object' && value.isGetter) {
                    // Clear the getter flag and call the getter function.
                    value.isGetter = false;
                    var func = (value);
                    return this.createGetter_(func, state.object_);
                }
                stack[stack.length - 1].value = value;
            }
        };
        ;
        Interpreter.prototype.stepNewExpression = function (stack, state, node) {
            return this.stepCallExpression(stack, state, node);
        };
        Interpreter.prototype.stepObjectExpression = function (stack, state, node) {
            var n = state.n_ || 0;
            var property = node['properties'][n];
            if (!state.object_) {
                // First execution.
                state.object_ = this.createObjectProto(this.OBJECT_PROTO);
                state.properties_ = Object.create(null);
            }
            else {
                // Determine property name.
                var key = property['key'];
                if (key['type'] === 'Identifier') {
                    var propName = key['name'];
                }
                else if (key['type'] === 'Literal') {
                    var propName = key['value'];
                }
                else {
                    throw SyntaxError('Unknown object structure: ' + key['type']);
                }
                // Set the property computed in the previous execution.
                if (!state.properties_[propName]) {
                    // Create temp object to collect value, getter, and/or setter.
                    state.properties_[propName] = {};
                }
                state.properties_[propName][property['kind']] = state.value;
                state.n_ = ++n;
                property = node['properties'][n];
            }
            if (property) {
                return new Interpreter.MyState(property['value'], state.scope);
            }
            for (var key in state.properties_) {
                var kinds = state.properties_[key];
                if ('get' in kinds || 'set' in kinds) {
                    // Set a property with a getter or setter.
                    var descriptor = {
                        configurable: true,
                        enumerable: true,
                        get: kinds['get'],
                        set: kinds['set']
                    };
                    this.setProperty(state.object_, key, null, descriptor);
                }
                else {
                    // Set a normal property with a value.
                    this.setProperty(state.object_, key, kinds['init']);
                }
            }
            stack.pop();
            stack[stack.length - 1].value = state.object_;
        };
        ;
        Interpreter.prototype.stepProgram = function (stack, state, node) {
            var n = state.n_ || 0;
            var expression = node['body'][n];
            if (expression) {
                state.done = false;
                state.n_ = n + 1;
                return new Interpreter.MyState(expression, state.scope);
            }
            state.done = true;
            // Don't pop the stateStack.
            // Leave the root scope on the tree in case the program is appended to.
        };
        ;
        Interpreter.prototype.stepReturnStatement = function (stack, state, node) {
            if (node['argument'] && !state.done_) {
                state.done_ = true;
                return new Interpreter.MyState(node['argument'], state.scope);
            }
            var value = state.value;
            var i = stack.length - 1;
            state = stack[i];
            while (state.node['type'] !== 'CallExpression' &&
                state.node['type'] !== 'NewExpression') {
                if (state.node['type'] !== 'TryStatement') {
                    stack.splice(i, 1);
                }
                i--;
                if (i < 0) {
                    // Syntax error, do not allow this error to be trapped.
                    throw SyntaxError('Illegal return statement');
                }
                state = stack[i];
            }
            state.value = value;
        };
        ;
        Interpreter.prototype.stepSequenceExpression = function (stack, state, node) {
            var n = state.n_ || 0;
            var expression = node['expressions'][n];
            if (expression) {
                state.n_ = n + 1;
                return new Interpreter.MyState(expression, state.scope);
            }
            stack.pop();
            stack[stack.length - 1].value = state.value;
        };
        ;
        Interpreter.prototype.stepSwitchStatement = function (stack, state, node) {
            if (!state.test_) {
                state.test_ = 1;
                return new Interpreter.MyState(node['discriminant'], state.scope);
            }
            if (state.test_ === 1) {
                state.test_ = 2;
                // Preserve switch value between case tests.
                state.switchValue_ = state.value;
            }
            while (true) {
                var index = state.index_ || 0;
                var switchCase = node['cases'][index];
                if (!state.matched_ && switchCase && !switchCase['test']) {
                    // Test on the default case is null.
                    // Bypass (but store) the default case, and get back to it later.
                    state.defaultCase_ = index;
                    state.index_ = index + 1;
                    continue;
                }
                if (!switchCase && !state.matched_ && state.defaultCase_) {
                    // Ran through all cases, no match.  Jump to the default.
                    state.matched_ = true;
                    state.index_ = state.defaultCase_;
                    continue;
                }
                if (switchCase) {
                    if (!state.matched_ && !state.tested_ && switchCase['test']) {
                        state.tested_ = true;
                        return new Interpreter.MyState(switchCase['test'], state.scope);
                    }
                    if (state.matched_ || state.value === state.switchValue_) {
                        state.matched_ = true;
                        var n = state.n_ || 0;
                        if (switchCase['consequent'][n]) {
                            state.isSwitch = true;
                            state.n_ = n + 1;
                            return new Interpreter.MyState(switchCase['consequent'][n], state.scope);
                        }
                    }
                    // Move on to next case.
                    state.tested_ = false;
                    state.n_ = 0;
                    state.index_ = index + 1;
                }
                else {
                    stack.pop();
                    return;
                }
            }
        };
        ;
        Interpreter.prototype.stepThisExpression = function (stack, state, node) {
            stack.pop();
            stack[stack.length - 1].value = this.getValueFromScope('this');
        };
        ;
        Interpreter.prototype.stepThrowStatement = function (stack, state, node) {
            if (!state.done_) {
                state.done_ = true;
                return new Interpreter.MyState(node['argument'], state.scope);
            }
            else {
                this.throwException(state.value);
            }
        };
        ;
        Interpreter.prototype.stepTryStatement = function (stack, state, node) {
            if (!state.doneBlock_) {
                state.doneBlock_ = true;
                return new Interpreter.MyState(node['block'], state.scope);
            }
            if (state.throwValue && !state.doneHandler_ && node['handler']) {
                state.doneHandler_ = true;
                var nextState = new Interpreter.MyState(node['handler'], state.scope);
                nextState.throwValue = state.throwValue;
                state.throwValue = null; // This error has been handled, don't rethrow.
                return nextState;
            }
            if (!state.doneFinalizer_ && node['finalizer']) {
                state.doneFinalizer_ = true;
                return new Interpreter.MyState(node['finalizer'], state.scope);
            }
            if (state.throwValue) {
                // There was no catch handler, or the catch/finally threw an error.
                // Throw the error up to a higher try.
                this.executeException(state.throwValue);
            }
            else {
                stack.pop();
            }
        };
        ;
        Interpreter.prototype.stepUnaryExpression = function (stack, state, node) {
            if (!state.done_) {
                state.done_ = true;
                var nextState = new Interpreter.MyState(node['argument'], state.scope);
                nextState.components = node['operator'] === 'delete';
                return nextState;
            }
            stack.pop();
            var value = state.value;
            if (node['operator'] === '-') {
                value = -value;
            }
            else if (node['operator'] === '+') {
                value = +value;
            }
            else if (node['operator'] === '!') {
                value = !value;
            }
            else if (node['operator'] === '~') {
                value = ~value;
            }
            else if (node['operator'] === 'delete') {
                var result = true;
                // If value is not an array, then it is a primitive, or some other value.
                // If so, skip the delete and return true.
                if (Array.isArray(value)) {
                    var obj = value[0];
                    if (obj === Interpreter.SCOPE_REFERENCE) {
                        // 'delete foo;' is the same as 'delete window.foo'.
                        obj = state.scope;
                    }
                    var name = String(value[1]);
                    try {
                        delete obj.properties[name];
                    }
                    catch (e) {
                        if (state.scope.strict) {
                            this.throwException(this.TYPE_ERROR, "Cannot delete property '" +
                                name + "' of '" + obj + "'");
                        }
                        else {
                            result = false;
                        }
                    }
                }
                value = result;
            }
            else if (node['operator'] === 'typeof') {
                value = (value && value.class === 'Function') ? 'function' : typeof value;
            }
            else if (node['operator'] === 'void') {
                value = undefined;
            }
            else {
                throw SyntaxError('Unknown unary operator: ' + node['operator']);
            }
            stack[stack.length - 1].value = value;
        };
        ;
        Interpreter.prototype.stepUpdateExpression = function (stack, state, node) {
            if (!state.doneLeft_) {
                state.doneLeft_ = true;
                var nextState = new Interpreter.MyState(node['argument'], state.scope);
                nextState.components = true;
                return nextState;
            }
            if (!state.leftSide_) {
                state.leftSide_ = state.value;
            }
            if (state.doneGetter_) {
                state.leftValue_ = state.value;
            }
            if (!state.doneGetter_) {
                var leftValue = this.getValue(state.leftSide_);
                state.leftValue_ = leftValue;
                if (leftValue && typeof leftValue === 'object' && leftValue.isGetter) {
                    // Clear the getter flag and call the getter function.
                    leftValue.isGetter = false;
                    state.doneGetter_ = true;
                    var func = (leftValue);
                    return this.createGetter_(func, state.leftSide_);
                }
            }
            if (state.doneSetter_) {
                // Return if setter function.
                // Setter method on property has completed.
                // Ignore its return value, and use the original set value instead.
                stack.pop();
                stack[stack.length - 1].value = state.doneSetter_;
                return;
            }
            leftValue = Number(state.leftValue_);
            var changeValue;
            if (node['operator'] === '++') {
                changeValue = leftValue + 1;
            }
            else if (node['operator'] === '--') {
                changeValue = leftValue - 1;
            }
            else {
                throw SyntaxError('Unknown update expression: ' + node['operator']);
            }
            var returnValue = node['prefix'] ? changeValue : leftValue;
            var setter = this.setValue(state.leftSide_, changeValue);
            if (setter) {
                state.doneSetter_ = returnValue;
                return this.createSetter_(setter, state.leftSide_, changeValue);
            }
            // Return if no setter function.
            stack.pop();
            stack[stack.length - 1].value = returnValue;
        };
        ;
        Interpreter.prototype.stepVariableDeclaration = function (stack, state, node) {
            var declarations = node['declarations'];
            var n = state.n_ || 0;
            var declarationNode = declarations[n];
            if (state.init_ && declarationNode) {
                // This setValue call never needs to deal with calling a setter function.
                // Note that this is setting the init value, not defining the variable.
                // Variable definition is done when scope is populated.
                this.setValueToScope(declarationNode['id']['name'], state.value);
                state.init_ = false;
                declarationNode = declarations[++n];
            }
            while (declarationNode) {
                // Skip any declarations that are not initialized.  They have already
                // been defined as undefined in populateScope_.
                if (declarationNode['init']) {
                    state.n_ = n;
                    state.init_ = true;
                    return new Interpreter.MyState(declarationNode['init'], state.scope);
                }
                declarationNode = declarations[++n];
            }
            stack.pop();
        };
        ;
        Interpreter.prototype.stepWithStatement = function (stack, state, node) {
            if (!state.doneObject_) {
                state.doneObject_ = true;
                return new Interpreter.MyState(node['object'], state.scope);
            }
            else if (!state.doneBody_) {
                state.doneBody_ = true;
                var scope = this.createSpecialScope(state.scope, state.value);
                return new Interpreter.MyState(node['body'], scope);
            }
            else {
                stack.pop();
            }
        };
        ;
        Interpreter.prototype.stepWhileStatement = function (stack, state, node) {
            return this.stepDoWhileStatement(stack, state, node);
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
         * Property descriptor of variables.
         */
        Interpreter.VARIABLE_DESCRIPTOR = {
            configurable: false,
            enumerable: true,
            writable: true
        };
        /**
         * Unique symbol for indicating that a step has encountered an error, has
         * added it to the stack, and will be thrown within the user's program.
         * When STEP_ERROR is thrown in the JS-Interpreter, the error can be ignored.
         */
        Interpreter.STEP_ERROR = {};
        /**
         * Unique symbol for indicating that a reference is a variable on the scope,
         * not an object property.
         */
        Interpreter.SCOPE_REFERENCE = {};
        /**
         * For cycle detection in array to string and error conversion;
         * see spec bug github.com/tc39/ecma262/issues/289
         * Since this is for atomic actions only, it can be a class property.
         */
        Interpreter.toStringCycles_ = [];
        return Interpreter;
    }());
    // Preserve top-level API functions from being pruned/renamed by JS compilers.
    // Add others as needed.
    // The global object ('window' in a browser, 'global' in node.js) is 'this'.
    this['Interpreter'] = Interpreter;
    Interpreter.prototype['step'] = Interpreter.prototype.step;
    Interpreter.prototype['run'] = Interpreter.prototype.run;
    Interpreter.prototype['appendCode'] = Interpreter.prototype.appendCode;
    Interpreter.prototype['createObject'] = Interpreter.prototype.createObject;
    Interpreter.prototype['createObjectProto'] =
        Interpreter.prototype.createObjectProto;
    Interpreter.prototype['createAsyncFunction'] =
        Interpreter.prototype.createAsyncFunction;
    Interpreter.prototype['createNativeFunction'] =
        Interpreter.prototype.createNativeFunction;
    Interpreter.prototype['getProperty'] = Interpreter.prototype.getProperty;
    Interpreter.prototype['setProperty'] = Interpreter.prototype.setProperty;
    Interpreter.prototype['nativeToPseudo'] = Interpreter.prototype.nativeToPseudo;
    Interpreter.prototype['pseudoToNative'] = Interpreter.prototype.pseudoToNative;
    // Obsolete.  Do not use.
    Interpreter.prototype['createPrimitive'] = function (x) { return x; };
    (function (Interpreter) {
        /**
         * Class for an object.
         * @param {Interpreter.MyObject} proto Prototype object or null.
         * @constructor
         */
        var MyObject = (function () {
            function MyObject(proto) {
                /** @type {Interpreter.MyObject} */
                this.proto = null;
                /** @type {boolean} */
                this.isObject = true;
                /** @type {string} */
                this.class = 'Object';
                /** @type {Date|RegExp|boolean|number|string|undefined|null} */
                this.data = null;
                this.getter = Object.create(null);
                this.setter = Object.create(null);
                this.properties = Object.create(null);
                this.proto = proto;
            }
            /**
             * Convert this object into a string.
             * @return {string} String value.
             * @override
             */
            MyObject.prototype.toString = function () {
                if (this.class === 'Array') {
                    // Array
                    var cycles = Interpreter.toStringCycles_;
                    cycles.push(this);
                    try {
                        var strs = [];
                        for (var i = 0; i < this.properties.length; i++) {
                            var value = this.properties[i];
                            strs[i] = (value && value.isObject && cycles.indexOf(value) !== -1) ?
                                '...' : value;
                        }
                    }
                    finally {
                        cycles.pop();
                    }
                    return strs.join(',');
                }
                if (this.class === 'Error') {
                    var cycles = Interpreter.toStringCycles_;
                    if (cycles.indexOf(this) !== -1) {
                        return '[object Error]';
                    }
                    var name, message;
                    // Bug: Does not support getters and setters for name or message.
                    var obj = this;
                    do {
                        if ('name' in obj.properties) {
                            name = obj.properties['name'];
                            break;
                        }
                    } while ((obj = obj.proto));
                    var obj = this;
                    do {
                        if ('message' in obj.properties) {
                            message = obj.properties['message'];
                            break;
                        }
                    } while ((obj = obj.proto));
                    cycles.push(this);
                    try {
                        name = name && name.toString();
                        message = message && message.toString();
                    }
                    finally {
                        cycles.pop();
                    }
                    return message ? name + ': ' + message : String(name);
                }
                // RegExp, Date, and boxed primitives.
                if (this.data !== null) {
                    return String(this.data);
                }
                return '[object ' + this.class + ']';
            };
            /**
             * Return the object's value.
             * @return {Interpreter.MyValue} Value.
             * @override
             */
            MyObject.prototype.valueOf = function () {
                if (this.data === undefined || this.data === null ||
                    this.data instanceof RegExp) {
                    return this; // An Object.
                }
                if (this.data instanceof Date) {
                    return this.data.valueOf(); // Milliseconds.
                }
                return (this.data); // Boxed primitive.
            };
            return MyObject;
        }());
        Interpreter.MyObject = MyObject;
        /**
         * Class for a state.
         * @param {!MyObject} node AST node for the state.
         * @param {!Interpreter.MyObject} scope Scope object for the state.
         * @constructor
         */
        var MyState = (function () {
            function MyState(node, scope) {
                this.node = node;
                this.scope = scope;
            }
            return MyState;
        }());
        Interpreter.MyState = MyState;
    })(Interpreter || (Interpreter = {}));
    // These lines are added for API compatibility
    Interpreter['Object'] = Interpreter.MyObject;
    Interpreter['State'] = Interpreter.MyState;
    return Interpreter;
}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0)))

/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "version", function() { return version; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "parse", function() { return parse; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "parseExpressionAt", function() { return parseExpressionAt; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "tokenizer", function() { return tokenizer; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "parse_dammit", function() { return parse_dammit; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "LooseParser", function() { return LooseParser; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "pluginsLoose", function() { return pluginsLoose; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "addLooseExports", function() { return addLooseExports; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Parser", function() { return Parser; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "plugins", function() { return plugins; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "defaultOptions", function() { return defaultOptions; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Position", function() { return Position; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SourceLocation", function() { return SourceLocation; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getLineInfo", function() { return getLineInfo; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Node", function() { return Node; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TokenType", function() { return TokenType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "tokTypes", function() { return types; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "keywordTypes", function() { return keywords$1; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TokContext", function() { return TokContext; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "tokContexts", function() { return types$1; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "isIdentifierChar", function() { return isIdentifierChar; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "isIdentifierStart", function() { return isIdentifierStart; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Token", function() { return Token; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "isNewLine", function() { return isNewLine; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "lineBreak", function() { return lineBreak; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "lineBreakG", function() { return lineBreakG; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "nonASCIIwhitespace", function() { return nonASCIIwhitespace; });
// Reserved word lists for various dialects of the language

var reservedWords = {
  3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
  5: "class enum extends super const export import",
  6: "enum",
  strict: "implements interface let package private protected public static yield",
  strictBind: "eval arguments"
};

// And the keywords

var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

var keywords = {
  5: ecma5AndLessKeywords,
  6: ecma5AndLessKeywords + " const class extends export import super"
};

// ## Character categories

// Big ugly regular expressions that match characters in the
// whitespace, identifier, and identifier-start categories. These
// are only applied when a character is found to actually have a
// code point above 128.
// Generated by `bin/generate-identifier-regex.js`.

var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fd5\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7ae\ua7b0-\ua7b7\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
var nonASCIIidentifierChars = "\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d4-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d01-\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf8\u1cf9\u1dc0-\u1df5\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua900-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";

var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;

// These are a run-length and offset encoded representation of the
// >0xffff code points that are a valid part of identifiers. The
// offset starts at 0x10000, and each pair of numbers represents an
// offset to the next range, and then a size of the range. They were
// generated by bin/generate-identifier-regex.js

// eslint-disable-next-line comma-spacing
var astralIdentifierStartCodes = [0,11,2,25,2,18,2,1,2,14,3,13,35,122,70,52,268,28,4,48,48,31,17,26,6,37,11,29,3,35,5,7,2,4,43,157,19,35,5,35,5,39,9,51,157,310,10,21,11,7,153,5,3,0,2,43,2,1,4,0,3,22,11,22,10,30,66,18,2,1,11,21,11,25,71,55,7,1,65,0,16,3,2,2,2,26,45,28,4,28,36,7,2,27,28,53,11,21,11,18,14,17,111,72,56,50,14,50,785,52,76,44,33,24,27,35,42,34,4,0,13,47,15,3,22,0,2,0,36,17,2,24,85,6,2,0,2,3,2,14,2,9,8,46,39,7,3,1,3,21,2,6,2,1,2,4,4,0,19,0,13,4,159,52,19,3,54,47,21,1,2,0,185,46,42,3,37,47,21,0,60,42,86,25,391,63,32,0,449,56,264,8,2,36,18,0,50,29,881,921,103,110,18,195,2749,1070,4050,582,8634,568,8,30,114,29,19,47,17,3,32,20,6,18,881,68,12,0,67,12,65,0,32,6124,20,754,9486,1,3071,106,6,12,4,8,8,9,5991,84,2,70,2,1,3,0,3,1,3,3,2,11,2,0,2,6,2,64,2,3,3,7,2,6,2,27,2,3,2,4,2,0,4,6,2,339,3,24,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,7,4149,196,60,67,1213,3,2,26,2,1,2,0,3,0,2,9,2,3,2,0,2,0,7,0,5,0,2,0,2,0,2,2,2,1,2,0,3,0,2,0,2,0,2,0,2,0,2,1,2,0,3,3,2,6,2,3,2,3,2,0,2,9,2,16,6,2,2,4,2,16,4421,42710,42,4148,12,221,3,5761,10591,541];

// eslint-disable-next-line comma-spacing
var astralIdentifierCodes = [509,0,227,0,150,4,294,9,1368,2,2,1,6,3,41,2,5,0,166,1,1306,2,54,14,32,9,16,3,46,10,54,9,7,2,37,13,2,9,52,0,13,2,49,13,10,2,4,9,83,11,7,0,161,11,6,9,7,3,57,0,2,6,3,1,3,2,10,0,11,1,3,6,4,4,193,17,10,9,87,19,13,9,214,6,3,8,28,1,83,16,16,9,82,12,9,9,84,14,5,9,423,9,838,7,2,7,17,9,57,21,2,13,19882,9,135,4,60,6,26,9,1016,45,17,3,19723,1,5319,4,4,5,9,7,3,6,31,3,149,2,1418,49,513,54,5,49,9,0,15,0,23,4,2,14,1361,6,2,16,3,6,2,1,2,4,2214,6,110,6,6,9,792487,239];

// This has a complexity linear to the value of the code. The
// assumption is that looking up astral identifier characters is
// rare.
function isInAstralSet(code, set) {
  var pos = 0x10000;
  for (var i = 0; i < set.length; i += 2) {
    pos += set[i];
    if (pos > code) { return false }
    pos += set[i + 1];
    if (pos >= code) { return true }
  }
}

// Test whether a given character code starts an identifier.

function isIdentifierStart(code, astral) {
  if (code < 65) { return code === 36 }
  if (code < 91) { return true }
  if (code < 97) { return code === 95 }
  if (code < 123) { return true }
  if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code)) }
  if (astral === false) { return false }
  return isInAstralSet(code, astralIdentifierStartCodes)
}

// Test whether a given character is part of an identifier.

function isIdentifierChar(code, astral) {
  if (code < 48) { return code === 36 }
  if (code < 58) { return true }
  if (code < 65) { return false }
  if (code < 91) { return true }
  if (code < 97) { return code === 95 }
  if (code < 123) { return true }
  if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code)) }
  if (astral === false) { return false }
  return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes)
}

// ## Token types

// The assignment of fine-grained, information-carrying type objects
// allows the tokenizer to store the information it has about a
// token in a way that is very cheap for the parser to look up.

// All token type variables start with an underscore, to make them
// easy to recognize.

// The `beforeExpr` property is used to disambiguate between regular
// expressions and divisions. It is set on all token types that can
// be followed by an expression (thus, a slash after them would be a
// regular expression).
//
// The `startsExpr` property is used to check if the token ends a
// `yield` expression. It is set on all token types that either can
// directly start an expression (like a quotation mark) or can
// continue an expression (like the body of a string).
//
// `isLoop` marks a keyword as starting a loop, which is important
// to know when parsing a label, in order to allow or disallow
// continue jumps to that label.

var TokenType = function TokenType(label, conf) {
  if ( conf === void 0 ) conf = {};

  this.label = label;
  this.keyword = conf.keyword;
  this.beforeExpr = !!conf.beforeExpr;
  this.startsExpr = !!conf.startsExpr;
  this.isLoop = !!conf.isLoop;
  this.isAssign = !!conf.isAssign;
  this.prefix = !!conf.prefix;
  this.postfix = !!conf.postfix;
  this.binop = conf.binop || null;
  this.updateContext = null;
};

function binop(name, prec) {
  return new TokenType(name, {beforeExpr: true, binop: prec})
}
var beforeExpr = {beforeExpr: true};
var startsExpr = {startsExpr: true};

// Map keyword names to token types.

var keywords$1 = {};

// Succinct definitions of keyword token types
function kw(name, options) {
  if ( options === void 0 ) options = {};

  options.keyword = name;
  return keywords$1[name] = new TokenType(name, options)
}

var types = {
  num: new TokenType("num", startsExpr),
  regexp: new TokenType("regexp", startsExpr),
  string: new TokenType("string", startsExpr),
  name: new TokenType("name", startsExpr),
  eof: new TokenType("eof"),

  // Punctuation token types.
  bracketL: new TokenType("[", {beforeExpr: true, startsExpr: true}),
  bracketR: new TokenType("]"),
  braceL: new TokenType("{", {beforeExpr: true, startsExpr: true}),
  braceR: new TokenType("}"),
  parenL: new TokenType("(", {beforeExpr: true, startsExpr: true}),
  parenR: new TokenType(")"),
  comma: new TokenType(",", beforeExpr),
  semi: new TokenType(";", beforeExpr),
  colon: new TokenType(":", beforeExpr),
  dot: new TokenType("."),
  question: new TokenType("?", beforeExpr),
  arrow: new TokenType("=>", beforeExpr),
  template: new TokenType("template"),
  invalidTemplate: new TokenType("invalidTemplate"),
  ellipsis: new TokenType("...", beforeExpr),
  backQuote: new TokenType("`", startsExpr),
  dollarBraceL: new TokenType("${", {beforeExpr: true, startsExpr: true}),

  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator.
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.

  eq: new TokenType("=", {beforeExpr: true, isAssign: true}),
  assign: new TokenType("_=", {beforeExpr: true, isAssign: true}),
  incDec: new TokenType("++/--", {prefix: true, postfix: true, startsExpr: true}),
  prefix: new TokenType("prefix", {beforeExpr: true, prefix: true, startsExpr: true}),
  logicalOR: binop("||", 1),
  logicalAND: binop("&&", 2),
  bitwiseOR: binop("|", 3),
  bitwiseXOR: binop("^", 4),
  bitwiseAND: binop("&", 5),
  equality: binop("==/!=", 6),
  relational: binop("</>", 7),
  bitShift: binop("<</>>", 8),
  plusMin: new TokenType("+/-", {beforeExpr: true, binop: 9, prefix: true, startsExpr: true}),
  modulo: binop("%", 10),
  star: binop("*", 10),
  slash: binop("/", 10),
  starstar: new TokenType("**", {beforeExpr: true}),

  // Keyword token types.
  _break: kw("break"),
  _case: kw("case", beforeExpr),
  _catch: kw("catch"),
  _continue: kw("continue"),
  _debugger: kw("debugger"),
  _default: kw("default", beforeExpr),
  _do: kw("do", {isLoop: true, beforeExpr: true}),
  _else: kw("else", beforeExpr),
  _finally: kw("finally"),
  _for: kw("for", {isLoop: true}),
  _function: kw("function", startsExpr),
  _if: kw("if"),
  _return: kw("return", beforeExpr),
  _switch: kw("switch"),
  _throw: kw("throw", beforeExpr),
  _try: kw("try"),
  _var: kw("var"),
  _const: kw("const"),
  _while: kw("while", {isLoop: true}),
  _with: kw("with"),
  _new: kw("new", {beforeExpr: true, startsExpr: true}),
  _this: kw("this", startsExpr),
  _super: kw("super", startsExpr),
  _class: kw("class", startsExpr),
  _extends: kw("extends", beforeExpr),
  _export: kw("export"),
  _import: kw("import"),
  _null: kw("null", startsExpr),
  _true: kw("true", startsExpr),
  _false: kw("false", startsExpr),
  _in: kw("in", {beforeExpr: true, binop: 7}),
  _instanceof: kw("instanceof", {beforeExpr: true, binop: 7}),
  _typeof: kw("typeof", {beforeExpr: true, prefix: true, startsExpr: true}),
  _void: kw("void", {beforeExpr: true, prefix: true, startsExpr: true}),
  _delete: kw("delete", {beforeExpr: true, prefix: true, startsExpr: true})
};

// Matches a whole line break (where CRLF is considered a single
// line break). Used to count lines.

var lineBreak = /\r\n?|\n|\u2028|\u2029/;
var lineBreakG = new RegExp(lineBreak.source, "g");

function isNewLine(code) {
  return code === 10 || code === 13 || code === 0x2028 || code === 0x2029
}

var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;

var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;

var ref = Object.prototype;
var hasOwnProperty = ref.hasOwnProperty;
var toString = ref.toString;

// Checks if an object has a property.

function has(obj, propName) {
  return hasOwnProperty.call(obj, propName)
}

var isArray = Array.isArray || (function (obj) { return (
  toString.call(obj) === "[object Array]"
); });

// These are used when `options.locations` is on, for the
// `startLoc` and `endLoc` properties.

var Position = function Position(line, col) {
  this.line = line;
  this.column = col;
};

Position.prototype.offset = function offset (n) {
  return new Position(this.line, this.column + n)
};

var SourceLocation = function SourceLocation(p, start, end) {
  this.start = start;
  this.end = end;
  if (p.sourceFile !== null) { this.source = p.sourceFile; }
};

// The `getLineInfo` function is mostly useful when the
// `locations` option is off (for performance reasons) and you
// want to find the line/column position for a given character
// offset. `input` should be the code string that the offset refers
// into.

function getLineInfo(input, offset) {
  for (var line = 1, cur = 0;;) {
    lineBreakG.lastIndex = cur;
    var match = lineBreakG.exec(input);
    if (match && match.index < offset) {
      ++line;
      cur = match.index + match[0].length;
    } else {
      return new Position(line, offset - cur)
    }
  }
}

// A second optional argument can be given to further configure
// the parser process. These options are recognized:

var defaultOptions = {
  // `ecmaVersion` indicates the ECMAScript version to parse. Must
  // be either 3, 5, 6 (2015), 7 (2016), or 8 (2017). This influences support
  // for strict mode, the set of reserved words, and support for
  // new syntax features. The default is 7.
  ecmaVersion: 7,
  // `sourceType` indicates the mode the code should be parsed in.
  // Can be either `"script"` or `"module"`. This influences global
  // strict mode and parsing of `import` and `export` declarations.
  sourceType: "script",
  // `onInsertedSemicolon` can be a callback that will be called
  // when a semicolon is automatically inserted. It will be passed
  // th position of the comma as an offset, and if `locations` is
  // enabled, it is given the location as a `{line, column}` object
  // as second argument.
  onInsertedSemicolon: null,
  // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
  // trailing commas.
  onTrailingComma: null,
  // By default, reserved words are only enforced if ecmaVersion >= 5.
  // Set `allowReserved` to a boolean value to explicitly turn this on
  // an off. When this option has the value "never", reserved words
  // and keywords can also not be used as property names.
  allowReserved: null,
  // When enabled, a return at the top level is not considered an
  // error.
  allowReturnOutsideFunction: false,
  // When enabled, import/export statements are not constrained to
  // appearing at the top of the program.
  allowImportExportEverywhere: false,
  // When enabled, hashbang directive in the beginning of file
  // is allowed and treated as a line comment.
  allowHashBang: false,
  // When `locations` is on, `loc` properties holding objects with
  // `start` and `end` properties in `{line, column}` form (with
  // line being 1-based and column 0-based) will be attached to the
  // nodes.
  locations: false,
  // A function can be passed as `onToken` option, which will
  // cause Acorn to call that function with object in the same
  // format as tokens returned from `tokenizer().getToken()`. Note
  // that you are not allowed to call the parser from the
  // callback—that will corrupt its internal state.
  onToken: null,
  // A function can be passed as `onComment` option, which will
  // cause Acorn to call that function with `(block, text, start,
  // end)` parameters whenever a comment is skipped. `block` is a
  // boolean indicating whether this is a block (`/* */`) comment,
  // `text` is the content of the comment, and `start` and `end` are
  // character offsets that denote the start and end of the comment.
  // When the `locations` option is on, two more parameters are
  // passed, the full `{line, column}` locations of the start and
  // end of the comments. Note that you are not allowed to call the
  // parser from the callback—that will corrupt its internal state.
  onComment: null,
  // Nodes have their start and end characters offsets recorded in
  // `start` and `end` properties (directly on the node, rather than
  // the `loc` object, which holds line/column data. To also add a
  // [semi-standardized][range] `range` property holding a `[start,
  // end]` array with the same numbers, set the `ranges` option to
  // `true`.
  //
  // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
  ranges: false,
  // It is possible to parse multiple files into a single AST by
  // passing the tree produced by parsing the first file as
  // `program` option in subsequent parses. This will add the
  // toplevel forms of the parsed file to the `Program` (top) node
  // of an existing parse tree.
  program: null,
  // When `locations` is on, you can pass this to record the source
  // file in every node's `loc` object.
  sourceFile: null,
  // This value, if given, is stored in every node, whether
  // `locations` is on or off.
  directSourceFile: null,
  // When enabled, parenthesized expressions are represented by
  // (non-standard) ParenthesizedExpression nodes
  preserveParens: false,
  plugins: {}
};

// Interpret and default an options object

function getOptions(opts) {
  var options = {};

  for (var opt in defaultOptions)
    { options[opt] = opts && has(opts, opt) ? opts[opt] : defaultOptions[opt]; }

  if (options.ecmaVersion >= 2015)
    { options.ecmaVersion -= 2009; }

  if (options.allowReserved == null)
    { options.allowReserved = options.ecmaVersion < 5; }

  if (isArray(options.onToken)) {
    var tokens = options.onToken;
    options.onToken = function (token) { return tokens.push(token); };
  }
  if (isArray(options.onComment))
    { options.onComment = pushComment(options, options.onComment); }

  return options
}

function pushComment(options, array) {
  return function(block, text, start, end, startLoc, endLoc) {
    var comment = {
      type: block ? "Block" : "Line",
      value: text,
      start: start,
      end: end
    };
    if (options.locations)
      { comment.loc = new SourceLocation(this, startLoc, endLoc); }
    if (options.ranges)
      { comment.range = [start, end]; }
    array.push(comment);
  }
}

// Registered plugins
var plugins = {};

function keywordRegexp(words) {
  return new RegExp("^(?:" + words.replace(/ /g, "|") + ")$")
}

var Parser = function Parser(options, input, startPos) {
  this.options = options = getOptions(options);
  this.sourceFile = options.sourceFile;
  this.keywords = keywordRegexp(keywords[options.ecmaVersion >= 6 ? 6 : 5]);
  var reserved = "";
  if (!options.allowReserved) {
    for (var v = options.ecmaVersion;; v--)
      { if (reserved = reservedWords[v]) { break } }
    if (options.sourceType == "module") { reserved += " await"; }
  }
  this.reservedWords = keywordRegexp(reserved);
  var reservedStrict = (reserved ? reserved + " " : "") + reservedWords.strict;
  this.reservedWordsStrict = keywordRegexp(reservedStrict);
  this.reservedWordsStrictBind = keywordRegexp(reservedStrict + " " + reservedWords.strictBind);
  this.input = String(input);

  // Used to signal to callers of `readWord1` whether the word
  // contained any escape sequences. This is needed because words with
  // escape sequences must not be interpreted as keywords.
  this.containsEsc = false;

  // Load plugins
  this.loadPlugins(options.plugins);

  // Set up token state

  // The current position of the tokenizer in the input.
  if (startPos) {
    this.pos = startPos;
    this.lineStart = this.input.lastIndexOf("\n", startPos - 1) + 1;
    this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length;
  } else {
    this.pos = this.lineStart = 0;
    this.curLine = 1;
  }

  // Properties of the current token:
  // Its type
  this.type = types.eof;
  // For tokens that include more information than their type, the value
  this.value = null;
  // Its start and end offset
  this.start = this.end = this.pos;
  // And, if locations are used, the {line, column} object
  // corresponding to those offsets
  this.startLoc = this.endLoc = this.curPosition();

  // Position information for the previous token
  this.lastTokEndLoc = this.lastTokStartLoc = null;
  this.lastTokStart = this.lastTokEnd = this.pos;

  // The context stack is used to superficially track syntactic
  // context to predict whether a regular expression is allowed in a
  // given position.
  this.context = this.initialContext();
  this.exprAllowed = true;

  // Figure out if it's a module code.
  this.inModule = options.sourceType === "module";
  this.strict = this.inModule || this.strictDirective(this.pos);

  // Used to signify the start of a potential arrow function
  this.potentialArrowAt = -1;

  // Flags to track whether we are in a function, a generator, an async function.
  this.inFunction = this.inGenerator = this.inAsync = false;
  // Positions to delayed-check that yield/await does not exist in default parameters.
  this.yieldPos = this.awaitPos = 0;
  // Labels in scope.
  this.labels = [];

  // If enabled, skip leading hashbang line.
  if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === "#!")
    { this.skipLineComment(2); }

  // Scope tracking for duplicate variable names (see scope.js)
  this.scopeStack = [];
  this.enterFunctionScope();
};

// DEPRECATED Kept for backwards compatibility until 3.0 in case a plugin uses them
Parser.prototype.isKeyword = function isKeyword (word) { return this.keywords.test(word) };
Parser.prototype.isReservedWord = function isReservedWord (word) { return this.reservedWords.test(word) };

Parser.prototype.extend = function extend (name, f) {
  this[name] = f(this[name]);
};

Parser.prototype.loadPlugins = function loadPlugins (pluginConfigs) {
    var this$1 = this;

  for (var name in pluginConfigs) {
    var plugin = plugins[name];
    if (!plugin) { throw new Error("Plugin '" + name + "' not found") }
    plugin(this$1, pluginConfigs[name]);
  }
};

Parser.prototype.parse = function parse () {
  var node = this.options.program || this.startNode();
  this.nextToken();
  return this.parseTopLevel(node)
};

var pp = Parser.prototype;

// ## Parser utilities

var literal = /^(?:'((?:[^']|\.)*)'|"((?:[^"]|\.)*)"|;)/;
pp.strictDirective = function(start) {
  var this$1 = this;

  for (;;) {
    skipWhiteSpace.lastIndex = start;
    start += skipWhiteSpace.exec(this$1.input)[0].length;
    var match = literal.exec(this$1.input.slice(start));
    if (!match) { return false }
    if ((match[1] || match[2]) == "use strict") { return true }
    start += match[0].length;
  }
};

// Predicate that tests whether the next token is of the given
// type, and if yes, consumes it as a side effect.

pp.eat = function(type) {
  if (this.type === type) {
    this.next();
    return true
  } else {
    return false
  }
};

// Tests whether parsed token is a contextual keyword.

pp.isContextual = function(name) {
  return this.type === types.name && this.value === name
};

// Consumes contextual keyword if possible.

pp.eatContextual = function(name) {
  return this.value === name && this.eat(types.name)
};

// Asserts that following token is given contextual keyword.

pp.expectContextual = function(name) {
  if (!this.eatContextual(name)) { this.unexpected(); }
};

// Test whether a semicolon can be inserted at the current position.

pp.canInsertSemicolon = function() {
  return this.type === types.eof ||
    this.type === types.braceR ||
    lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
};

pp.insertSemicolon = function() {
  if (this.canInsertSemicolon()) {
    if (this.options.onInsertedSemicolon)
      { this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc); }
    return true
  }
};

// Consume a semicolon, or, failing that, see if we are allowed to
// pretend that there is a semicolon at this position.

pp.semicolon = function() {
  if (!this.eat(types.semi) && !this.insertSemicolon()) { this.unexpected(); }
};

pp.afterTrailingComma = function(tokType, notNext) {
  if (this.type == tokType) {
    if (this.options.onTrailingComma)
      { this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc); }
    if (!notNext)
      { this.next(); }
    return true
  }
};

// Expect a token of a given type. If found, consume it, otherwise,
// raise an unexpected token error.

pp.expect = function(type) {
  this.eat(type) || this.unexpected();
};

// Raise an unexpected token error.

pp.unexpected = function(pos) {
  this.raise(pos != null ? pos : this.start, "Unexpected token");
};

function DestructuringErrors() {
  this.shorthandAssign =
  this.trailingComma =
  this.parenthesizedAssign =
  this.parenthesizedBind =
    -1;
}

pp.checkPatternErrors = function(refDestructuringErrors, isAssign) {
  if (!refDestructuringErrors) { return }
  if (refDestructuringErrors.trailingComma > -1)
    { this.raiseRecoverable(refDestructuringErrors.trailingComma, "Comma is not permitted after the rest element"); }
  var parens = isAssign ? refDestructuringErrors.parenthesizedAssign : refDestructuringErrors.parenthesizedBind;
  if (parens > -1) { this.raiseRecoverable(parens, "Parenthesized pattern"); }
};

pp.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
  var pos = refDestructuringErrors ? refDestructuringErrors.shorthandAssign : -1;
  if (!andThrow) { return pos >= 0 }
  if (pos > -1) { this.raise(pos, "Shorthand property assignments are valid only in destructuring patterns"); }
};

pp.checkYieldAwaitInDefaultParams = function() {
  if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos))
    { this.raise(this.yieldPos, "Yield expression cannot be a default value"); }
  if (this.awaitPos)
    { this.raise(this.awaitPos, "Await expression cannot be a default value"); }
};

pp.isSimpleAssignTarget = function(expr) {
  if (expr.type === "ParenthesizedExpression")
    { return this.isSimpleAssignTarget(expr.expression) }
  return expr.type === "Identifier" || expr.type === "MemberExpression"
};

var pp$1 = Parser.prototype;

// ### Statement parsing

// Parse a program. Initializes the parser, reads any number of
// statements, and wraps them in a Program node.  Optionally takes a
// `program` argument.  If present, the statements will be appended
// to its body instead of creating a new node.

pp$1.parseTopLevel = function(node) {
  var this$1 = this;

  var exports = {};
  if (!node.body) { node.body = []; }
  while (this.type !== types.eof) {
    var stmt = this$1.parseStatement(true, true, exports);
    node.body.push(stmt);
  }
  this.next();
  if (this.options.ecmaVersion >= 6) {
    node.sourceType = this.options.sourceType;
  }
  return this.finishNode(node, "Program")
};

var loopLabel = {kind: "loop"};
var switchLabel = {kind: "switch"};

pp$1.isLet = function() {
  if (this.type !== types.name || this.options.ecmaVersion < 6 || this.value != "let") { return false }
  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
  if (nextCh === 91 || nextCh == 123) { return true } // '{' and '['
  if (isIdentifierStart(nextCh, true)) {
    var pos = next + 1;
    while (isIdentifierChar(this.input.charCodeAt(pos), true)) { ++pos; }
    var ident = this.input.slice(next, pos);
    if (!this.isKeyword(ident)) { return true }
  }
  return false
};

// check 'async [no LineTerminator here] function'
// - 'async /*foo*/ function' is OK.
// - 'async /*\n*/ function' is invalid.
pp$1.isAsyncFunction = function() {
  if (this.type !== types.name || this.options.ecmaVersion < 8 || this.value != "async")
    { return false }

  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length;
  return !lineBreak.test(this.input.slice(this.pos, next)) &&
    this.input.slice(next, next + 8) === "function" &&
    (next + 8 == this.input.length || !isIdentifierChar(this.input.charAt(next + 8)))
};

// Parse a single statement.
//
// If expecting a statement and finding a slash operator, parse a
// regular expression literal. This is to handle cases like
// `if (foo) /blah/.exec(foo)`, where looking at the previous token
// does not help.

pp$1.parseStatement = function(declaration, topLevel, exports) {
  var starttype = this.type, node = this.startNode(), kind;

  if (this.isLet()) {
    starttype = types._var;
    kind = "let";
  }

  // Most types of statements are recognized by the keyword they
  // start with. Many are trivial to parse, some require a bit of
  // complexity.

  switch (starttype) {
  case types._break: case types._continue: return this.parseBreakContinueStatement(node, starttype.keyword)
  case types._debugger: return this.parseDebuggerStatement(node)
  case types._do: return this.parseDoStatement(node)
  case types._for: return this.parseForStatement(node)
  case types._function:
    if (!declaration && this.options.ecmaVersion >= 6) { this.unexpected(); }
    return this.parseFunctionStatement(node, false)
  case types._class:
    if (!declaration) { this.unexpected(); }
    return this.parseClass(node, true)
  case types._if: return this.parseIfStatement(node)
  case types._return: return this.parseReturnStatement(node)
  case types._switch: return this.parseSwitchStatement(node)
  case types._throw: return this.parseThrowStatement(node)
  case types._try: return this.parseTryStatement(node)
  case types._const: case types._var:
    kind = kind || this.value;
    if (!declaration && kind != "var") { this.unexpected(); }
    return this.parseVarStatement(node, kind)
  case types._while: return this.parseWhileStatement(node)
  case types._with: return this.parseWithStatement(node)
  case types.braceL: return this.parseBlock()
  case types.semi: return this.parseEmptyStatement(node)
  case types._export:
  case types._import:
    if (!this.options.allowImportExportEverywhere) {
      if (!topLevel)
        { this.raise(this.start, "'import' and 'export' may only appear at the top level"); }
      if (!this.inModule)
        { this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'"); }
    }
    return starttype === types._import ? this.parseImport(node) : this.parseExport(node, exports)

    // If the statement does not start with a statement keyword or a
    // brace, it's an ExpressionStatement or LabeledStatement. We
    // simply start parsing an expression, and afterwards, if the
    // next token is a colon and the expression was a simple
    // Identifier node, we switch to interpreting it as a label.
  default:
    if (this.isAsyncFunction() && declaration) {
      this.next();
      return this.parseFunctionStatement(node, true)
    }

    var maybeName = this.value, expr = this.parseExpression();
    if (starttype === types.name && expr.type === "Identifier" && this.eat(types.colon))
      { return this.parseLabeledStatement(node, maybeName, expr) }
    else { return this.parseExpressionStatement(node, expr) }
  }
};

pp$1.parseBreakContinueStatement = function(node, keyword) {
  var this$1 = this;

  var isBreak = keyword == "break";
  this.next();
  if (this.eat(types.semi) || this.insertSemicolon()) { node.label = null; }
  else if (this.type !== types.name) { this.unexpected(); }
  else {
    node.label = this.parseIdent();
    this.semicolon();
  }

  // Verify that there is an actual destination to break or
  // continue to.
  var i = 0;
  for (; i < this.labels.length; ++i) {
    var lab = this$1.labels[i];
    if (node.label == null || lab.name === node.label.name) {
      if (lab.kind != null && (isBreak || lab.kind === "loop")) { break }
      if (node.label && isBreak) { break }
    }
  }
  if (i === this.labels.length) { this.raise(node.start, "Unsyntactic " + keyword); }
  return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement")
};

pp$1.parseDebuggerStatement = function(node) {
  this.next();
  this.semicolon();
  return this.finishNode(node, "DebuggerStatement")
};

pp$1.parseDoStatement = function(node) {
  this.next();
  this.labels.push(loopLabel);
  node.body = this.parseStatement(false);
  this.labels.pop();
  this.expect(types._while);
  node.test = this.parseParenExpression();
  if (this.options.ecmaVersion >= 6)
    { this.eat(types.semi); }
  else
    { this.semicolon(); }
  return this.finishNode(node, "DoWhileStatement")
};

// Disambiguating between a `for` and a `for`/`in` or `for`/`of`
// loop is non-trivial. Basically, we have to parse the init `var`
// statement or expression, disallowing the `in` operator (see
// the second parameter to `parseExpression`), and then check
// whether the next token is `in` or `of`. When there is no init
// part (semicolon immediately after the opening parenthesis), it
// is a regular `for` loop.

pp$1.parseForStatement = function(node) {
  this.next();
  this.labels.push(loopLabel);
  this.enterLexicalScope();
  this.expect(types.parenL);
  if (this.type === types.semi) { return this.parseFor(node, null) }
  var isLet = this.isLet();
  if (this.type === types._var || this.type === types._const || isLet) {
    var init$1 = this.startNode(), kind = isLet ? "let" : this.value;
    this.next();
    this.parseVar(init$1, true, kind);
    this.finishNode(init$1, "VariableDeclaration");
    if ((this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) && init$1.declarations.length === 1 &&
        !(kind !== "var" && init$1.declarations[0].init))
      { return this.parseForIn(node, init$1) }
    return this.parseFor(node, init$1)
  }
  var refDestructuringErrors = new DestructuringErrors;
  var init = this.parseExpression(true, refDestructuringErrors);
  if (this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
    this.toAssignable(init);
    this.checkLVal(init);
    this.checkPatternErrors(refDestructuringErrors, true);
    return this.parseForIn(node, init)
  } else {
    this.checkExpressionErrors(refDestructuringErrors, true);
  }
  return this.parseFor(node, init)
};

pp$1.parseFunctionStatement = function(node, isAsync) {
  this.next();
  return this.parseFunction(node, true, false, isAsync)
};

pp$1.isFunction = function() {
  return this.type === types._function || this.isAsyncFunction()
};

pp$1.parseIfStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  // allow function declarations in branches, but only in non-strict mode
  node.consequent = this.parseStatement(!this.strict && this.isFunction());
  node.alternate = this.eat(types._else) ? this.parseStatement(!this.strict && this.isFunction()) : null;
  return this.finishNode(node, "IfStatement")
};

pp$1.parseReturnStatement = function(node) {
  if (!this.inFunction && !this.options.allowReturnOutsideFunction)
    { this.raise(this.start, "'return' outside of function"); }
  this.next();

  // In `return` (and `break`/`continue`), the keywords with
  // optional arguments, we eagerly look for a semicolon or the
  // possibility to insert one.

  if (this.eat(types.semi) || this.insertSemicolon()) { node.argument = null; }
  else { node.argument = this.parseExpression(); this.semicolon(); }
  return this.finishNode(node, "ReturnStatement")
};

pp$1.parseSwitchStatement = function(node) {
  var this$1 = this;

  this.next();
  node.discriminant = this.parseParenExpression();
  node.cases = [];
  this.expect(types.braceL);
  this.labels.push(switchLabel);
  this.enterLexicalScope();

  // Statements under must be grouped (by label) in SwitchCase
  // nodes. `cur` is used to keep the node that we are currently
  // adding statements to.

  var cur;
  for (var sawDefault = false; this.type != types.braceR;) {
    if (this$1.type === types._case || this$1.type === types._default) {
      var isCase = this$1.type === types._case;
      if (cur) { this$1.finishNode(cur, "SwitchCase"); }
      node.cases.push(cur = this$1.startNode());
      cur.consequent = [];
      this$1.next();
      if (isCase) {
        cur.test = this$1.parseExpression();
      } else {
        if (sawDefault) { this$1.raiseRecoverable(this$1.lastTokStart, "Multiple default clauses"); }
        sawDefault = true;
        cur.test = null;
      }
      this$1.expect(types.colon);
    } else {
      if (!cur) { this$1.unexpected(); }
      cur.consequent.push(this$1.parseStatement(true));
    }
  }
  this.exitLexicalScope();
  if (cur) { this.finishNode(cur, "SwitchCase"); }
  this.next(); // Closing brace
  this.labels.pop();
  return this.finishNode(node, "SwitchStatement")
};

pp$1.parseThrowStatement = function(node) {
  this.next();
  if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start)))
    { this.raise(this.lastTokEnd, "Illegal newline after throw"); }
  node.argument = this.parseExpression();
  this.semicolon();
  return this.finishNode(node, "ThrowStatement")
};

// Reused empty array added for node fields that are always empty.

var empty = [];

pp$1.parseTryStatement = function(node) {
  this.next();
  node.block = this.parseBlock();
  node.handler = null;
  if (this.type === types._catch) {
    var clause = this.startNode();
    this.next();
    this.expect(types.parenL);
    clause.param = this.parseBindingAtom();
    this.enterLexicalScope();
    this.checkLVal(clause.param, "let");
    this.expect(types.parenR);
    clause.body = this.parseBlock(false);
    this.exitLexicalScope();
    node.handler = this.finishNode(clause, "CatchClause");
  }
  node.finalizer = this.eat(types._finally) ? this.parseBlock() : null;
  if (!node.handler && !node.finalizer)
    { this.raise(node.start, "Missing catch or finally clause"); }
  return this.finishNode(node, "TryStatement")
};

pp$1.parseVarStatement = function(node, kind) {
  this.next();
  this.parseVar(node, false, kind);
  this.semicolon();
  return this.finishNode(node, "VariableDeclaration")
};

pp$1.parseWhileStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  this.labels.push(loopLabel);
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, "WhileStatement")
};

pp$1.parseWithStatement = function(node) {
  if (this.strict) { this.raise(this.start, "'with' in strict mode"); }
  this.next();
  node.object = this.parseParenExpression();
  node.body = this.parseStatement(false);
  return this.finishNode(node, "WithStatement")
};

pp$1.parseEmptyStatement = function(node) {
  this.next();
  return this.finishNode(node, "EmptyStatement")
};

pp$1.parseLabeledStatement = function(node, maybeName, expr) {
  var this$1 = this;

  for (var i$1 = 0, list = this$1.labels; i$1 < list.length; i$1 += 1)
    {
    var label = list[i$1];

    if (label.name === maybeName)
      { this$1.raise(expr.start, "Label '" + maybeName + "' is already declared");
  } }
  var kind = this.type.isLoop ? "loop" : this.type === types._switch ? "switch" : null;
  for (var i = this.labels.length - 1; i >= 0; i--) {
    var label$1 = this$1.labels[i];
    if (label$1.statementStart == node.start) {
      label$1.statementStart = this$1.start;
      label$1.kind = kind;
    } else { break }
  }
  this.labels.push({name: maybeName, kind: kind, statementStart: this.start});
  node.body = this.parseStatement(true);
  if (node.body.type == "ClassDeclaration" ||
      node.body.type == "VariableDeclaration" && node.body.kind != "var" ||
      node.body.type == "FunctionDeclaration" && (this.strict || node.body.generator))
    { this.raiseRecoverable(node.body.start, "Invalid labeled declaration"); }
  this.labels.pop();
  node.label = expr;
  return this.finishNode(node, "LabeledStatement")
};

pp$1.parseExpressionStatement = function(node, expr) {
  node.expression = expr;
  this.semicolon();
  return this.finishNode(node, "ExpressionStatement")
};

// Parse a semicolon-enclosed block of statements, handling `"use
// strict"` declarations when `allowStrict` is true (used for
// function bodies).

pp$1.parseBlock = function(createNewLexicalScope) {
  var this$1 = this;
  if ( createNewLexicalScope === void 0 ) createNewLexicalScope = true;

  var node = this.startNode();
  node.body = [];
  this.expect(types.braceL);
  if (createNewLexicalScope) {
    this.enterLexicalScope();
  }
  while (!this.eat(types.braceR)) {
    var stmt = this$1.parseStatement(true);
    node.body.push(stmt);
  }
  if (createNewLexicalScope) {
    this.exitLexicalScope();
  }
  return this.finishNode(node, "BlockStatement")
};

// Parse a regular `for` loop. The disambiguation code in
// `parseStatement` will already have parsed the init statement or
// expression.

pp$1.parseFor = function(node, init) {
  node.init = init;
  this.expect(types.semi);
  node.test = this.type === types.semi ? null : this.parseExpression();
  this.expect(types.semi);
  node.update = this.type === types.parenR ? null : this.parseExpression();
  this.expect(types.parenR);
  this.exitLexicalScope();
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, "ForStatement")
};

// Parse a `for`/`in` and `for`/`of` loop, which are almost
// same from parser's perspective.

pp$1.parseForIn = function(node, init) {
  var type = this.type === types._in ? "ForInStatement" : "ForOfStatement";
  this.next();
  node.left = init;
  node.right = this.parseExpression();
  this.expect(types.parenR);
  this.exitLexicalScope();
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, type)
};

// Parse a list of variable declarations.

pp$1.parseVar = function(node, isFor, kind) {
  var this$1 = this;

  node.declarations = [];
  node.kind = kind;
  for (;;) {
    var decl = this$1.startNode();
    this$1.parseVarId(decl, kind);
    if (this$1.eat(types.eq)) {
      decl.init = this$1.parseMaybeAssign(isFor);
    } else if (kind === "const" && !(this$1.type === types._in || (this$1.options.ecmaVersion >= 6 && this$1.isContextual("of")))) {
      this$1.unexpected();
    } else if (decl.id.type != "Identifier" && !(isFor && (this$1.type === types._in || this$1.isContextual("of")))) {
      this$1.raise(this$1.lastTokEnd, "Complex binding patterns require an initialization value");
    } else {
      decl.init = null;
    }
    node.declarations.push(this$1.finishNode(decl, "VariableDeclarator"));
    if (!this$1.eat(types.comma)) { break }
  }
  return node
};

pp$1.parseVarId = function(decl, kind) {
  decl.id = this.parseBindingAtom(kind);
  this.checkLVal(decl.id, kind, false);
};

// Parse a function declaration or literal (depending on the
// `isStatement` parameter).

pp$1.parseFunction = function(node, isStatement, allowExpressionBody, isAsync) {
  this.initFunction(node);
  if (this.options.ecmaVersion >= 6 && !isAsync)
    { node.generator = this.eat(types.star); }
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  if (isStatement) {
    node.id = isStatement === "nullableID" && this.type != types.name ? null : this.parseIdent();
    if (node.id) {
      this.checkLVal(node.id, "var");
    }
  }

  var oldInGen = this.inGenerator, oldInAsync = this.inAsync,
      oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldInFunc = this.inFunction;
  this.inGenerator = node.generator;
  this.inAsync = node.async;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.inFunction = true;
  this.enterFunctionScope();

  if (!isStatement)
    { node.id = this.type == types.name ? this.parseIdent() : null; }

  this.parseFunctionParams(node);
  this.parseFunctionBody(node, allowExpressionBody);

  this.inGenerator = oldInGen;
  this.inAsync = oldInAsync;
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.inFunction = oldInFunc;
  return this.finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression")
};

pp$1.parseFunctionParams = function(node) {
  this.expect(types.parenL);
  node.params = this.parseBindingList(types.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
};

// Parse a class declaration or literal (depending on the
// `isStatement` parameter).

pp$1.parseClass = function(node, isStatement) {
  var this$1 = this;

  this.next();

  this.parseClassId(node, isStatement);
  this.parseClassSuper(node);
  var classBody = this.startNode();
  var hadConstructor = false;
  classBody.body = [];
  this.expect(types.braceL);
  while (!this.eat(types.braceR)) {
    if (this$1.eat(types.semi)) { continue }
    var method = this$1.startNode();
    var isGenerator = this$1.eat(types.star);
    var isAsync = false;
    var isMaybeStatic = this$1.type === types.name && this$1.value === "static";
    this$1.parsePropertyName(method);
    method.static = isMaybeStatic && this$1.type !== types.parenL;
    if (method.static) {
      if (isGenerator) { this$1.unexpected(); }
      isGenerator = this$1.eat(types.star);
      this$1.parsePropertyName(method);
    }
    if (this$1.options.ecmaVersion >= 8 && !isGenerator && !method.computed &&
        method.key.type === "Identifier" && method.key.name === "async" && this$1.type !== types.parenL &&
        !this$1.canInsertSemicolon()) {
      isAsync = true;
      this$1.parsePropertyName(method);
    }
    method.kind = "method";
    var isGetSet = false;
    if (!method.computed) {
      var key = method.key;
      if (!isGenerator && !isAsync && key.type === "Identifier" && this$1.type !== types.parenL && (key.name === "get" || key.name === "set")) {
        isGetSet = true;
        method.kind = key.name;
        key = this$1.parsePropertyName(method);
      }
      if (!method.static && (key.type === "Identifier" && key.name === "constructor" ||
          key.type === "Literal" && key.value === "constructor")) {
        if (hadConstructor) { this$1.raise(key.start, "Duplicate constructor in the same class"); }
        if (isGetSet) { this$1.raise(key.start, "Constructor can't have get/set modifier"); }
        if (isGenerator) { this$1.raise(key.start, "Constructor can't be a generator"); }
        if (isAsync) { this$1.raise(key.start, "Constructor can't be an async method"); }
        method.kind = "constructor";
        hadConstructor = true;
      }
    }
    this$1.parseClassMethod(classBody, method, isGenerator, isAsync);
    if (isGetSet) {
      var paramCount = method.kind === "get" ? 0 : 1;
      if (method.value.params.length !== paramCount) {
        var start = method.value.start;
        if (method.kind === "get")
          { this$1.raiseRecoverable(start, "getter should have no params"); }
        else
          { this$1.raiseRecoverable(start, "setter should have exactly one param"); }
      } else {
        if (method.kind === "set" && method.value.params[0].type === "RestElement")
          { this$1.raiseRecoverable(method.value.params[0].start, "Setter cannot use rest params"); }
      }
    }
  }
  node.body = this.finishNode(classBody, "ClassBody");
  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression")
};

pp$1.parseClassMethod = function(classBody, method, isGenerator, isAsync) {
  method.value = this.parseMethod(isGenerator, isAsync);
  classBody.body.push(this.finishNode(method, "MethodDefinition"));
};

pp$1.parseClassId = function(node, isStatement) {
  node.id = this.type === types.name ? this.parseIdent() : isStatement === true ? this.unexpected() : null;
};

pp$1.parseClassSuper = function(node) {
  node.superClass = this.eat(types._extends) ? this.parseExprSubscripts() : null;
};

// Parses module export declaration.

pp$1.parseExport = function(node, exports) {
  var this$1 = this;

  this.next();
  // export * from '...'
  if (this.eat(types.star)) {
    this.expectContextual("from");
    node.source = this.type === types.string ? this.parseExprAtom() : this.unexpected();
    this.semicolon();
    return this.finishNode(node, "ExportAllDeclaration")
  }
  if (this.eat(types._default)) { // export default ...
    this.checkExport(exports, "default", this.lastTokStart);
    var isAsync;
    if (this.type === types._function || (isAsync = this.isAsyncFunction())) {
      var fNode = this.startNode();
      this.next();
      if (isAsync) { this.next(); }
      node.declaration = this.parseFunction(fNode, "nullableID", false, isAsync);
    } else if (this.type === types._class) {
      var cNode = this.startNode();
      node.declaration = this.parseClass(cNode, "nullableID");
    } else {
      node.declaration = this.parseMaybeAssign();
      this.semicolon();
    }
    return this.finishNode(node, "ExportDefaultDeclaration")
  }
  // export var|const|let|function|class ...
  if (this.shouldParseExportStatement()) {
    node.declaration = this.parseStatement(true);
    if (node.declaration.type === "VariableDeclaration")
      { this.checkVariableExport(exports, node.declaration.declarations); }
    else
      { this.checkExport(exports, node.declaration.id.name, node.declaration.id.start); }
    node.specifiers = [];
    node.source = null;
  } else { // export { x, y as z } [from '...']
    node.declaration = null;
    node.specifiers = this.parseExportSpecifiers(exports);
    if (this.eatContextual("from")) {
      node.source = this.type === types.string ? this.parseExprAtom() : this.unexpected();
    } else {
      // check for keywords used as local names
      for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
        var spec = list[i];

        this$1.checkUnreserved(spec.local);
      }

      node.source = null;
    }
    this.semicolon();
  }
  return this.finishNode(node, "ExportNamedDeclaration")
};

pp$1.checkExport = function(exports, name, pos) {
  if (!exports) { return }
  if (has(exports, name))
    { this.raiseRecoverable(pos, "Duplicate export '" + name + "'"); }
  exports[name] = true;
};

pp$1.checkPatternExport = function(exports, pat) {
  var this$1 = this;

  var type = pat.type;
  if (type == "Identifier")
    { this.checkExport(exports, pat.name, pat.start); }
  else if (type == "ObjectPattern")
    { for (var i = 0, list = pat.properties; i < list.length; i += 1)
      {
        var prop = list[i];

        this$1.checkPatternExport(exports, prop.value);
      } }
  else if (type == "ArrayPattern")
    { for (var i$1 = 0, list$1 = pat.elements; i$1 < list$1.length; i$1 += 1) {
      var elt = list$1[i$1];

        if (elt) { this$1.checkPatternExport(exports, elt); }
    } }
  else if (type == "AssignmentPattern")
    { this.checkPatternExport(exports, pat.left); }
  else if (type == "ParenthesizedExpression")
    { this.checkPatternExport(exports, pat.expression); }
};

pp$1.checkVariableExport = function(exports, decls) {
  var this$1 = this;

  if (!exports) { return }
  for (var i = 0, list = decls; i < list.length; i += 1)
    {
    var decl = list[i];

    this$1.checkPatternExport(exports, decl.id);
  }
};

pp$1.shouldParseExportStatement = function() {
  return this.type.keyword === "var" ||
    this.type.keyword === "const" ||
    this.type.keyword === "class" ||
    this.type.keyword === "function" ||
    this.isLet() ||
    this.isAsyncFunction()
};

// Parses a comma-separated list of module exports.

pp$1.parseExportSpecifiers = function(exports) {
  var this$1 = this;

  var nodes = [], first = true;
  // export { x, y as z } [from '...']
  this.expect(types.braceL);
  while (!this.eat(types.braceR)) {
    if (!first) {
      this$1.expect(types.comma);
      if (this$1.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var node = this$1.startNode();
    node.local = this$1.parseIdent(true);
    node.exported = this$1.eatContextual("as") ? this$1.parseIdent(true) : node.local;
    this$1.checkExport(exports, node.exported.name, node.exported.start);
    nodes.push(this$1.finishNode(node, "ExportSpecifier"));
  }
  return nodes
};

// Parses import declaration.

pp$1.parseImport = function(node) {
  this.next();
  // import '...'
  if (this.type === types.string) {
    node.specifiers = empty;
    node.source = this.parseExprAtom();
  } else {
    node.specifiers = this.parseImportSpecifiers();
    this.expectContextual("from");
    node.source = this.type === types.string ? this.parseExprAtom() : this.unexpected();
  }
  this.semicolon();
  return this.finishNode(node, "ImportDeclaration")
};

// Parses a comma-separated list of module imports.

pp$1.parseImportSpecifiers = function() {
  var this$1 = this;

  var nodes = [], first = true;
  if (this.type === types.name) {
    // import defaultObj, { x, y as z } from '...'
    var node = this.startNode();
    node.local = this.parseIdent();
    this.checkLVal(node.local, "let");
    nodes.push(this.finishNode(node, "ImportDefaultSpecifier"));
    if (!this.eat(types.comma)) { return nodes }
  }
  if (this.type === types.star) {
    var node$1 = this.startNode();
    this.next();
    this.expectContextual("as");
    node$1.local = this.parseIdent();
    this.checkLVal(node$1.local, "let");
    nodes.push(this.finishNode(node$1, "ImportNamespaceSpecifier"));
    return nodes
  }
  this.expect(types.braceL);
  while (!this.eat(types.braceR)) {
    if (!first) {
      this$1.expect(types.comma);
      if (this$1.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var node$2 = this$1.startNode();
    node$2.imported = this$1.parseIdent(true);
    if (this$1.eatContextual("as")) {
      node$2.local = this$1.parseIdent();
    } else {
      this$1.checkUnreserved(node$2.imported);
      node$2.local = node$2.imported;
    }
    this$1.checkLVal(node$2.local, "let");
    nodes.push(this$1.finishNode(node$2, "ImportSpecifier"));
  }
  return nodes
};

var pp$2 = Parser.prototype;

// Convert existing expression atom to assignable pattern
// if possible.

pp$2.toAssignable = function(node, isBinding) {
  var this$1 = this;

  if (this.options.ecmaVersion >= 6 && node) {
    switch (node.type) {
    case "Identifier":
      if (this.inAsync && node.name === "await")
        { this.raise(node.start, "Can not use 'await' as identifier inside an async function"); }
      break

    case "ObjectPattern":
    case "ArrayPattern":
      break

    case "ObjectExpression":
      node.type = "ObjectPattern";
      for (var i = 0, list = node.properties; i < list.length; i += 1) {
        var prop = list[i];

      if (prop.kind !== "init") { this$1.raise(prop.key.start, "Object pattern can't contain getter or setter"); }
        this$1.toAssignable(prop.value, isBinding);
      }
      break

    case "ArrayExpression":
      node.type = "ArrayPattern";
      this.toAssignableList(node.elements, isBinding);
      break

    case "AssignmentExpression":
      if (node.operator === "=") {
        node.type = "AssignmentPattern";
        delete node.operator;
        this.toAssignable(node.left, isBinding);
        // falls through to AssignmentPattern
      } else {
        this.raise(node.left.end, "Only '=' operator can be used for specifying default value.");
        break
      }

    case "AssignmentPattern":
      break

    case "ParenthesizedExpression":
      this.toAssignable(node.expression, isBinding);
      break

    case "MemberExpression":
      if (!isBinding) { break }

    default:
      this.raise(node.start, "Assigning to rvalue");
    }
  }
  return node
};

// Convert list of expression atoms to binding list.

pp$2.toAssignableList = function(exprList, isBinding) {
  var this$1 = this;

  var end = exprList.length;
  if (end) {
    var last = exprList[end - 1];
    if (last && last.type == "RestElement") {
      --end;
    } else if (last && last.type == "SpreadElement") {
      last.type = "RestElement";
      var arg = last.argument;
      this.toAssignable(arg, isBinding);
      --end;
    }

    if (this.options.ecmaVersion === 6 && isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier")
      { this.unexpected(last.argument.start); }
  }
  for (var i = 0; i < end; i++) {
    var elt = exprList[i];
    if (elt) { this$1.toAssignable(elt, isBinding); }
  }
  return exprList
};

// Parses spread element.

pp$2.parseSpread = function(refDestructuringErrors) {
  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
  return this.finishNode(node, "SpreadElement")
};

pp$2.parseRestBinding = function() {
  var node = this.startNode();
  this.next();

  // RestElement inside of a function parameter must be an identifier
  if (this.options.ecmaVersion === 6 && this.type !== types.name)
    { this.unexpected(); }

  node.argument = this.parseBindingAtom();

  return this.finishNode(node, "RestElement")
};

// Parses lvalue (assignable) atom.

pp$2.parseBindingAtom = function() {
  if (this.options.ecmaVersion < 6) { return this.parseIdent() }
  switch (this.type) {
  case types.name:
    return this.parseIdent()

  case types.bracketL:
    var node = this.startNode();
    this.next();
    node.elements = this.parseBindingList(types.bracketR, true, true);
    return this.finishNode(node, "ArrayPattern")

  case types.braceL:
    return this.parseObj(true)

  default:
    this.unexpected();
  }
};

pp$2.parseBindingList = function(close, allowEmpty, allowTrailingComma) {
  var this$1 = this;

  var elts = [], first = true;
  while (!this.eat(close)) {
    if (first) { first = false; }
    else { this$1.expect(types.comma); }
    if (allowEmpty && this$1.type === types.comma) {
      elts.push(null);
    } else if (allowTrailingComma && this$1.afterTrailingComma(close)) {
      break
    } else if (this$1.type === types.ellipsis) {
      var rest = this$1.parseRestBinding();
      this$1.parseBindingListItem(rest);
      elts.push(rest);
      if (this$1.type === types.comma) { this$1.raise(this$1.start, "Comma is not permitted after the rest element"); }
      this$1.expect(close);
      break
    } else {
      var elem = this$1.parseMaybeDefault(this$1.start, this$1.startLoc);
      this$1.parseBindingListItem(elem);
      elts.push(elem);
    }
  }
  return elts
};

pp$2.parseBindingListItem = function(param) {
  return param
};

// Parses assignment pattern around given atom if possible.

pp$2.parseMaybeDefault = function(startPos, startLoc, left) {
  left = left || this.parseBindingAtom();
  if (this.options.ecmaVersion < 6 || !this.eat(types.eq)) { return left }
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.right = this.parseMaybeAssign();
  return this.finishNode(node, "AssignmentPattern")
};

// Verify that a node is an lval — something that can be assigned
// to.
// bindingType can be either:
// 'var' indicating that the lval creates a 'var' binding
// 'let' indicating that the lval creates a lexical ('let' or 'const') binding
// 'none' indicating that the binding should be checked for illegal identifiers, but not for duplicate references

pp$2.checkLVal = function(expr, bindingType, checkClashes) {
  var this$1 = this;

  switch (expr.type) {
  case "Identifier":
    if (this.strict && this.reservedWordsStrictBind.test(expr.name))
      { this.raiseRecoverable(expr.start, (bindingType ? "Binding " : "Assigning to ") + expr.name + " in strict mode"); }
    if (checkClashes) {
      if (has(checkClashes, expr.name))
        { this.raiseRecoverable(expr.start, "Argument name clash"); }
      checkClashes[expr.name] = true;
    }
    if (bindingType && bindingType !== "none") {
      if (
        bindingType === "var" && !this.canDeclareVarName(expr.name) ||
        bindingType !== "var" && !this.canDeclareLexicalName(expr.name)
      ) {
        this.raiseRecoverable(expr.start, ("Identifier '" + (expr.name) + "' has already been declared"));
      }
      if (bindingType === "var") {
        this.declareVarName(expr.name);
      } else {
        this.declareLexicalName(expr.name);
      }
    }
    break

  case "MemberExpression":
    if (bindingType) { this.raiseRecoverable(expr.start, (bindingType ? "Binding" : "Assigning to") + " member expression"); }
    break

  case "ObjectPattern":
    for (var i = 0, list = expr.properties; i < list.length; i += 1)
      {
    var prop = list[i];

    this$1.checkLVal(prop.value, bindingType, checkClashes);
  }
    break

  case "ArrayPattern":
    for (var i$1 = 0, list$1 = expr.elements; i$1 < list$1.length; i$1 += 1) {
      var elem = list$1[i$1];

    if (elem) { this$1.checkLVal(elem, bindingType, checkClashes); }
    }
    break

  case "AssignmentPattern":
    this.checkLVal(expr.left, bindingType, checkClashes);
    break

  case "RestElement":
    this.checkLVal(expr.argument, bindingType, checkClashes);
    break

  case "ParenthesizedExpression":
    this.checkLVal(expr.expression, bindingType, checkClashes);
    break

  default:
    this.raise(expr.start, (bindingType ? "Binding" : "Assigning to") + " rvalue");
  }
};

// A recursive descent parser operates by defining functions for all
// syntactic elements, and recursively calling those, each function
// advancing the input stream and returning an AST node. Precedence
// of constructs (for example, the fact that `!x[1]` means `!(x[1])`
// instead of `(!x)[1]` is handled by the fact that the parser
// function that parses unary prefix operators is called first, and
// in turn calls the function that parses `[]` subscripts — that
// way, it'll receive the node for `x[1]` already parsed, and wraps
// *that* in the unary operator node.
//
// Acorn uses an [operator precedence parser][opp] to handle binary
// operator precedence, because it is much more compact than using
// the technique outlined above, which uses different, nesting
// functions to specify precedence, for all of the ten binary
// precedence levels that JavaScript defines.
//
// [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser

var pp$3 = Parser.prototype;

// Check if property name clashes with already added.
// Object/class getters and setters are not allowed to clash —
// either with each other or with an init property — and in
// strict mode, init properties are also not allowed to be repeated.

pp$3.checkPropClash = function(prop, propHash) {
  if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand))
    { return }
  var key = prop.key;
  var name;
  switch (key.type) {
  case "Identifier": name = key.name; break
  case "Literal": name = String(key.value); break
  default: return
  }
  var kind = prop.kind;
  if (this.options.ecmaVersion >= 6) {
    if (name === "__proto__" && kind === "init") {
      if (propHash.proto) { this.raiseRecoverable(key.start, "Redefinition of __proto__ property"); }
      propHash.proto = true;
    }
    return
  }
  name = "$" + name;
  var other = propHash[name];
  if (other) {
    var redefinition;
    if (kind === "init") {
      redefinition = this.strict && other.init || other.get || other.set;
    } else {
      redefinition = other.init || other[kind];
    }
    if (redefinition)
      { this.raiseRecoverable(key.start, "Redefinition of property"); }
  } else {
    other = propHash[name] = {
      init: false,
      get: false,
      set: false
    };
  }
  other[kind] = true;
};

// ### Expression parsing

// These nest, from the most general expression type at the top to
// 'atomic', nondivisible expression types at the bottom. Most of
// the functions will simply let the function(s) below them parse,
// and, *if* the syntactic construct they handle is present, wrap
// the AST node that the inner parser gave them in another node.

// Parse a full expression. The optional arguments are used to
// forbid the `in` operator (in for loops initalization expressions)
// and provide reference for storing '=' operator inside shorthand
// property assignment in contexts where both object expression
// and object pattern might appear (so it's possible to raise
// delayed syntax error at correct position).

pp$3.parseExpression = function(noIn, refDestructuringErrors) {
  var this$1 = this;

  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeAssign(noIn, refDestructuringErrors);
  if (this.type === types.comma) {
    var node = this.startNodeAt(startPos, startLoc);
    node.expressions = [expr];
    while (this.eat(types.comma)) { node.expressions.push(this$1.parseMaybeAssign(noIn, refDestructuringErrors)); }
    return this.finishNode(node, "SequenceExpression")
  }
  return expr
};

// Parse an assignment expression. This includes applications of
// operators like `+=`.

pp$3.parseMaybeAssign = function(noIn, refDestructuringErrors, afterLeftParse) {
  if (this.inGenerator && this.isContextual("yield")) { return this.parseYield() }

  var ownDestructuringErrors = false, oldParenAssign = -1, oldTrailingComma = -1;
  if (refDestructuringErrors) {
    oldParenAssign = refDestructuringErrors.parenthesizedAssign;
    oldTrailingComma = refDestructuringErrors.trailingComma;
    refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = -1;
  } else {
    refDestructuringErrors = new DestructuringErrors;
    ownDestructuringErrors = true;
  }

  var startPos = this.start, startLoc = this.startLoc;
  if (this.type == types.parenL || this.type == types.name)
    { this.potentialArrowAt = this.start; }
  var left = this.parseMaybeConditional(noIn, refDestructuringErrors);
  if (afterLeftParse) { left = afterLeftParse.call(this, left, startPos, startLoc); }
  if (this.type.isAssign) {
    this.checkPatternErrors(refDestructuringErrors, true);
    if (!ownDestructuringErrors) { DestructuringErrors.call(refDestructuringErrors); }
    var node = this.startNodeAt(startPos, startLoc);
    node.operator = this.value;
    node.left = this.type === types.eq ? this.toAssignable(left) : left;
    refDestructuringErrors.shorthandAssign = -1; // reset because shorthand default was used correctly
    this.checkLVal(left);
    this.next();
    node.right = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "AssignmentExpression")
  } else {
    if (ownDestructuringErrors) { this.checkExpressionErrors(refDestructuringErrors, true); }
  }
  if (oldParenAssign > -1) { refDestructuringErrors.parenthesizedAssign = oldParenAssign; }
  if (oldTrailingComma > -1) { refDestructuringErrors.trailingComma = oldTrailingComma; }
  return left
};

// Parse a ternary conditional (`?:`) operator.

pp$3.parseMaybeConditional = function(noIn, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprOps(noIn, refDestructuringErrors);
  if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
  if (this.eat(types.question)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.test = expr;
    node.consequent = this.parseMaybeAssign();
    this.expect(types.colon);
    node.alternate = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "ConditionalExpression")
  }
  return expr
};

// Start the precedence parser.

pp$3.parseExprOps = function(noIn, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeUnary(refDestructuringErrors, false);
  if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
  return expr.start == startPos && expr.type === "ArrowFunctionExpression" ? expr : this.parseExprOp(expr, startPos, startLoc, -1, noIn)
};

// Parse binary operators with the operator precedence parsing
// algorithm. `left` is the left-hand side of the operator.
// `minPrec` provides context that allows the function to stop and
// defer further parser to one of its callers when it encounters an
// operator that has a lower precedence than the set it is parsing.

pp$3.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, noIn) {
  var prec = this.type.binop;
  if (prec != null && (!noIn || this.type !== types._in)) {
    if (prec > minPrec) {
      var logical = this.type === types.logicalOR || this.type === types.logicalAND;
      var op = this.value;
      this.next();
      var startPos = this.start, startLoc = this.startLoc;
      var right = this.parseExprOp(this.parseMaybeUnary(null, false), startPos, startLoc, prec, noIn);
      var node = this.buildBinary(leftStartPos, leftStartLoc, left, right, op, logical);
      return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, noIn)
    }
  }
  return left
};

pp$3.buildBinary = function(startPos, startLoc, left, right, op, logical) {
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.operator = op;
  node.right = right;
  return this.finishNode(node, logical ? "LogicalExpression" : "BinaryExpression")
};

// Parse unary operators, both prefix and postfix.

pp$3.parseMaybeUnary = function(refDestructuringErrors, sawUnary) {
  var this$1 = this;

  var startPos = this.start, startLoc = this.startLoc, expr;
  if (this.inAsync && this.isContextual("await")) {
    expr = this.parseAwait(refDestructuringErrors);
    sawUnary = true;
  } else if (this.type.prefix) {
    var node = this.startNode(), update = this.type === types.incDec;
    node.operator = this.value;
    node.prefix = true;
    this.next();
    node.argument = this.parseMaybeUnary(null, true);
    this.checkExpressionErrors(refDestructuringErrors, true);
    if (update) { this.checkLVal(node.argument); }
    else if (this.strict && node.operator === "delete" &&
             node.argument.type === "Identifier")
      { this.raiseRecoverable(node.start, "Deleting local variable in strict mode"); }
    else { sawUnary = true; }
    expr = this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
  } else {
    expr = this.parseExprSubscripts(refDestructuringErrors);
    if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
    while (this.type.postfix && !this.canInsertSemicolon()) {
      var node$1 = this$1.startNodeAt(startPos, startLoc);
      node$1.operator = this$1.value;
      node$1.prefix = false;
      node$1.argument = expr;
      this$1.checkLVal(expr);
      this$1.next();
      expr = this$1.finishNode(node$1, "UpdateExpression");
    }
  }

  if (!sawUnary && this.eat(types.starstar))
    { return this.buildBinary(startPos, startLoc, expr, this.parseMaybeUnary(null, false), "**", false) }
  else
    { return expr }
};

// Parse call, dot, and `[]`-subscript expressions.

pp$3.parseExprSubscripts = function(refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprAtom(refDestructuringErrors);
  var skipArrowSubscripts = expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")";
  if (this.checkExpressionErrors(refDestructuringErrors) || skipArrowSubscripts) { return expr }
  var result = this.parseSubscripts(expr, startPos, startLoc);
  if (refDestructuringErrors && result.type === "MemberExpression") {
    if (refDestructuringErrors.parenthesizedAssign >= result.start) { refDestructuringErrors.parenthesizedAssign = -1; }
    if (refDestructuringErrors.parenthesizedBind >= result.start) { refDestructuringErrors.parenthesizedBind = -1; }
  }
  return result
};

pp$3.parseSubscripts = function(base, startPos, startLoc, noCalls) {
  var this$1 = this;

  var maybeAsyncArrow = this.options.ecmaVersion >= 8 && base.type === "Identifier" && base.name === "async" &&
      this.lastTokEnd == base.end && !this.canInsertSemicolon();
  for (var computed = (void 0);;) {
    if ((computed = this$1.eat(types.bracketL)) || this$1.eat(types.dot)) {
      var node = this$1.startNodeAt(startPos, startLoc);
      node.object = base;
      node.property = computed ? this$1.parseExpression() : this$1.parseIdent(true);
      node.computed = !!computed;
      if (computed) { this$1.expect(types.bracketR); }
      base = this$1.finishNode(node, "MemberExpression");
    } else if (!noCalls && this$1.eat(types.parenL)) {
      var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this$1.yieldPos, oldAwaitPos = this$1.awaitPos;
      this$1.yieldPos = 0;
      this$1.awaitPos = 0;
      var exprList = this$1.parseExprList(types.parenR, this$1.options.ecmaVersion >= 8, false, refDestructuringErrors);
      if (maybeAsyncArrow && !this$1.canInsertSemicolon() && this$1.eat(types.arrow)) {
        this$1.checkPatternErrors(refDestructuringErrors, false);
        this$1.checkYieldAwaitInDefaultParams();
        this$1.yieldPos = oldYieldPos;
        this$1.awaitPos = oldAwaitPos;
        return this$1.parseArrowExpression(this$1.startNodeAt(startPos, startLoc), exprList, true)
      }
      this$1.checkExpressionErrors(refDestructuringErrors, true);
      this$1.yieldPos = oldYieldPos || this$1.yieldPos;
      this$1.awaitPos = oldAwaitPos || this$1.awaitPos;
      var node$1 = this$1.startNodeAt(startPos, startLoc);
      node$1.callee = base;
      node$1.arguments = exprList;
      base = this$1.finishNode(node$1, "CallExpression");
    } else if (this$1.type === types.backQuote) {
      var node$2 = this$1.startNodeAt(startPos, startLoc);
      node$2.tag = base;
      node$2.quasi = this$1.parseTemplate({isTagged: true});
      base = this$1.finishNode(node$2, "TaggedTemplateExpression");
    } else {
      return base
    }
  }
};

// Parse an atomic expression — either a single token that is an
// expression, an expression started by a keyword like `function` or
// `new`, or an expression wrapped in punctuation like `()`, `[]`,
// or `{}`.

pp$3.parseExprAtom = function(refDestructuringErrors) {
  var node, canBeArrow = this.potentialArrowAt == this.start;
  switch (this.type) {
  case types._super:
    if (!this.inFunction)
      { this.raise(this.start, "'super' outside of function or class"); }

  case types._this:
    var type = this.type === types._this ? "ThisExpression" : "Super";
    node = this.startNode();
    this.next();
    return this.finishNode(node, type)

  case types.name:
    var startPos = this.start, startLoc = this.startLoc;
    var id = this.parseIdent(this.type !== types.name);
    if (this.options.ecmaVersion >= 8 && id.name === "async" && !this.canInsertSemicolon() && this.eat(types._function))
      { return this.parseFunction(this.startNodeAt(startPos, startLoc), false, false, true) }
    if (canBeArrow && !this.canInsertSemicolon()) {
      if (this.eat(types.arrow))
        { return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], false) }
      if (this.options.ecmaVersion >= 8 && id.name === "async" && this.type === types.name) {
        id = this.parseIdent();
        if (this.canInsertSemicolon() || !this.eat(types.arrow))
          { this.unexpected(); }
        return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], true)
      }
    }
    return id

  case types.regexp:
    var value = this.value;
    node = this.parseLiteral(value.value);
    node.regex = {pattern: value.pattern, flags: value.flags};
    return node

  case types.num: case types.string:
    return this.parseLiteral(this.value)

  case types._null: case types._true: case types._false:
    node = this.startNode();
    node.value = this.type === types._null ? null : this.type === types._true;
    node.raw = this.type.keyword;
    this.next();
    return this.finishNode(node, "Literal")

  case types.parenL:
    var start = this.start, expr = this.parseParenAndDistinguishExpression(canBeArrow);
    if (refDestructuringErrors) {
      if (refDestructuringErrors.parenthesizedAssign < 0 && !this.isSimpleAssignTarget(expr))
        { refDestructuringErrors.parenthesizedAssign = start; }
      if (refDestructuringErrors.parenthesizedBind < 0)
        { refDestructuringErrors.parenthesizedBind = start; }
    }
    return expr

  case types.bracketL:
    node = this.startNode();
    this.next();
    node.elements = this.parseExprList(types.bracketR, true, true, refDestructuringErrors);
    return this.finishNode(node, "ArrayExpression")

  case types.braceL:
    return this.parseObj(false, refDestructuringErrors)

  case types._function:
    node = this.startNode();
    this.next();
    return this.parseFunction(node, false)

  case types._class:
    return this.parseClass(this.startNode(), false)

  case types._new:
    return this.parseNew()

  case types.backQuote:
    return this.parseTemplate()

  default:
    this.unexpected();
  }
};

pp$3.parseLiteral = function(value) {
  var node = this.startNode();
  node.value = value;
  node.raw = this.input.slice(this.start, this.end);
  this.next();
  return this.finishNode(node, "Literal")
};

pp$3.parseParenExpression = function() {
  this.expect(types.parenL);
  var val = this.parseExpression();
  this.expect(types.parenR);
  return val
};

pp$3.parseParenAndDistinguishExpression = function(canBeArrow) {
  var this$1 = this;

  var startPos = this.start, startLoc = this.startLoc, val, allowTrailingComma = this.options.ecmaVersion >= 8;
  if (this.options.ecmaVersion >= 6) {
    this.next();

    var innerStartPos = this.start, innerStartLoc = this.startLoc;
    var exprList = [], first = true, lastIsComma = false;
    var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, spreadStart, innerParenStart;
    this.yieldPos = 0;
    this.awaitPos = 0;
    while (this.type !== types.parenR) {
      first ? first = false : this$1.expect(types.comma);
      if (allowTrailingComma && this$1.afterTrailingComma(types.parenR, true)) {
        lastIsComma = true;
        break
      } else if (this$1.type === types.ellipsis) {
        spreadStart = this$1.start;
        exprList.push(this$1.parseParenItem(this$1.parseRestBinding()));
        if (this$1.type === types.comma) { this$1.raise(this$1.start, "Comma is not permitted after the rest element"); }
        break
      } else {
        if (this$1.type === types.parenL && !innerParenStart) {
          innerParenStart = this$1.start;
        }
        exprList.push(this$1.parseMaybeAssign(false, refDestructuringErrors, this$1.parseParenItem));
      }
    }
    var innerEndPos = this.start, innerEndLoc = this.startLoc;
    this.expect(types.parenR);

    if (canBeArrow && !this.canInsertSemicolon() && this.eat(types.arrow)) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      if (innerParenStart) { this.unexpected(innerParenStart); }
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      return this.parseParenArrowList(startPos, startLoc, exprList)
    }

    if (!exprList.length || lastIsComma) { this.unexpected(this.lastTokStart); }
    if (spreadStart) { this.unexpected(spreadStart); }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;

    if (exprList.length > 1) {
      val = this.startNodeAt(innerStartPos, innerStartLoc);
      val.expressions = exprList;
      this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
    } else {
      val = exprList[0];
    }
  } else {
    val = this.parseParenExpression();
  }

  if (this.options.preserveParens) {
    var par = this.startNodeAt(startPos, startLoc);
    par.expression = val;
    return this.finishNode(par, "ParenthesizedExpression")
  } else {
    return val
  }
};

pp$3.parseParenItem = function(item) {
  return item
};

pp$3.parseParenArrowList = function(startPos, startLoc, exprList) {
  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList)
};

// New's precedence is slightly tricky. It must allow its argument to
// be a `[]` or dot subscript expression, but not a call — at least,
// not without wrapping it in parentheses. Thus, it uses the noCalls
// argument to parseSubscripts to prevent it from consuming the
// argument list.

var empty$1 = [];

pp$3.parseNew = function() {
  var node = this.startNode();
  var meta = this.parseIdent(true);
  if (this.options.ecmaVersion >= 6 && this.eat(types.dot)) {
    node.meta = meta;
    node.property = this.parseIdent(true);
    if (node.property.name !== "target")
      { this.raiseRecoverable(node.property.start, "The only valid meta property for new is new.target"); }
    if (!this.inFunction)
      { this.raiseRecoverable(node.start, "new.target can only be used in functions"); }
    return this.finishNode(node, "MetaProperty")
  }
  var startPos = this.start, startLoc = this.startLoc;
  node.callee = this.parseSubscripts(this.parseExprAtom(), startPos, startLoc, true);
  if (this.eat(types.parenL)) { node.arguments = this.parseExprList(types.parenR, this.options.ecmaVersion >= 8, false); }
  else { node.arguments = empty$1; }
  return this.finishNode(node, "NewExpression")
};

// Parse template expression.

pp$3.parseTemplateElement = function(ref) {
  var isTagged = ref.isTagged;

  var elem = this.startNode();
  if (this.type === types.invalidTemplate) {
    if (!isTagged) {
      this.raiseRecoverable(this.start, "Bad escape sequence in untagged template literal");
    }
    elem.value = {
      raw: this.value,
      cooked: null
    };
  } else {
    elem.value = {
      raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, "\n"),
      cooked: this.value
    };
  }
  this.next();
  elem.tail = this.type === types.backQuote;
  return this.finishNode(elem, "TemplateElement")
};

pp$3.parseTemplate = function(ref) {
  var this$1 = this;
  if ( ref === void 0 ) ref = {};
  var isTagged = ref.isTagged; if ( isTagged === void 0 ) isTagged = false;

  var node = this.startNode();
  this.next();
  node.expressions = [];
  var curElt = this.parseTemplateElement({isTagged: isTagged});
  node.quasis = [curElt];
  while (!curElt.tail) {
    this$1.expect(types.dollarBraceL);
    node.expressions.push(this$1.parseExpression());
    this$1.expect(types.braceR);
    node.quasis.push(curElt = this$1.parseTemplateElement({isTagged: isTagged}));
  }
  this.next();
  return this.finishNode(node, "TemplateLiteral")
};

// Parse an object literal or binding pattern.

pp$3.isAsyncProp = function(prop) {
  return !prop.computed && prop.key.type === "Identifier" && prop.key.name === "async" &&
    (this.type === types.name || this.type === types.num || this.type === types.string || this.type === types.bracketL) &&
    !lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
};

pp$3.parseObj = function(isPattern, refDestructuringErrors) {
  var this$1 = this;

  var node = this.startNode(), first = true, propHash = {};
  node.properties = [];
  this.next();
  while (!this.eat(types.braceR)) {
    if (!first) {
      this$1.expect(types.comma);
      if (this$1.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var prop = this$1.startNode(), isGenerator = (void 0), isAsync = (void 0), startPos = (void 0), startLoc = (void 0);
    if (this$1.options.ecmaVersion >= 6) {
      prop.method = false;
      prop.shorthand = false;
      if (isPattern || refDestructuringErrors) {
        startPos = this$1.start;
        startLoc = this$1.startLoc;
      }
      if (!isPattern)
        { isGenerator = this$1.eat(types.star); }
    }
    this$1.parsePropertyName(prop);
    if (!isPattern && this$1.options.ecmaVersion >= 8 && !isGenerator && this$1.isAsyncProp(prop)) {
      isAsync = true;
      this$1.parsePropertyName(prop, refDestructuringErrors);
    } else {
      isAsync = false;
    }
    this$1.parsePropertyValue(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors);
    this$1.checkPropClash(prop, propHash);
    node.properties.push(this$1.finishNode(prop, "Property"));
  }
  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression")
};

pp$3.parsePropertyValue = function(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors) {
  if ((isGenerator || isAsync) && this.type === types.colon)
    { this.unexpected(); }

  if (this.eat(types.colon)) {
    prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
    prop.kind = "init";
  } else if (this.options.ecmaVersion >= 6 && this.type === types.parenL) {
    if (isPattern) { this.unexpected(); }
    prop.kind = "init";
    prop.method = true;
    prop.value = this.parseMethod(isGenerator, isAsync);
  } else if (this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" &&
             (prop.key.name === "get" || prop.key.name === "set") &&
             (this.type != types.comma && this.type != types.braceR)) {
    if (isGenerator || isAsync || isPattern) { this.unexpected(); }
    prop.kind = prop.key.name;
    this.parsePropertyName(prop);
    prop.value = this.parseMethod(false);
    var paramCount = prop.kind === "get" ? 0 : 1;
    if (prop.value.params.length !== paramCount) {
      var start = prop.value.start;
      if (prop.kind === "get")
        { this.raiseRecoverable(start, "getter should have no params"); }
      else
        { this.raiseRecoverable(start, "setter should have exactly one param"); }
    } else {
      if (prop.kind === "set" && prop.value.params[0].type === "RestElement")
        { this.raiseRecoverable(prop.value.params[0].start, "Setter cannot use rest params"); }
    }
  } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
    this.checkUnreserved(prop.key);
    prop.kind = "init";
    if (isPattern) {
      prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
    } else if (this.type === types.eq && refDestructuringErrors) {
      if (refDestructuringErrors.shorthandAssign < 0)
        { refDestructuringErrors.shorthandAssign = this.start; }
      prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
    } else {
      prop.value = prop.key;
    }
    prop.shorthand = true;
  } else { this.unexpected(); }
};

pp$3.parsePropertyName = function(prop) {
  if (this.options.ecmaVersion >= 6) {
    if (this.eat(types.bracketL)) {
      prop.computed = true;
      prop.key = this.parseMaybeAssign();
      this.expect(types.bracketR);
      return prop.key
    } else {
      prop.computed = false;
    }
  }
  return prop.key = this.type === types.num || this.type === types.string ? this.parseExprAtom() : this.parseIdent(true)
};

// Initialize empty function node.

pp$3.initFunction = function(node) {
  node.id = null;
  if (this.options.ecmaVersion >= 6) {
    node.generator = false;
    node.expression = false;
  }
  if (this.options.ecmaVersion >= 8)
    { node.async = false; }
};

// Parse object or class method.

pp$3.parseMethod = function(isGenerator, isAsync) {
  var node = this.startNode(), oldInGen = this.inGenerator, oldInAsync = this.inAsync,
      oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldInFunc = this.inFunction;

  this.initFunction(node);
  if (this.options.ecmaVersion >= 6)
    { node.generator = isGenerator; }
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  this.inGenerator = node.generator;
  this.inAsync = node.async;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.inFunction = true;
  this.enterFunctionScope();

  this.expect(types.parenL);
  node.params = this.parseBindingList(types.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
  this.parseFunctionBody(node, false);

  this.inGenerator = oldInGen;
  this.inAsync = oldInAsync;
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.inFunction = oldInFunc;
  return this.finishNode(node, "FunctionExpression")
};

// Parse arrow function expression with given parameters.

pp$3.parseArrowExpression = function(node, params, isAsync) {
  var oldInGen = this.inGenerator, oldInAsync = this.inAsync,
      oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldInFunc = this.inFunction;

  this.enterFunctionScope();
  this.initFunction(node);
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  this.inGenerator = false;
  this.inAsync = node.async;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.inFunction = true;

  node.params = this.toAssignableList(params, true);
  this.parseFunctionBody(node, true);

  this.inGenerator = oldInGen;
  this.inAsync = oldInAsync;
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.inFunction = oldInFunc;
  return this.finishNode(node, "ArrowFunctionExpression")
};

// Parse function body and check parameters.

pp$3.parseFunctionBody = function(node, isArrowFunction) {
  var isExpression = isArrowFunction && this.type !== types.braceL;
  var oldStrict = this.strict, useStrict = false;

  if (isExpression) {
    node.body = this.parseMaybeAssign();
    node.expression = true;
    this.checkParams(node, false);
  } else {
    var nonSimple = this.options.ecmaVersion >= 7 && !this.isSimpleParamList(node.params);
    if (!oldStrict || nonSimple) {
      useStrict = this.strictDirective(this.end);
      // If this is a strict mode function, verify that argument names
      // are not repeated, and it does not try to bind the words `eval`
      // or `arguments`.
      if (useStrict && nonSimple)
        { this.raiseRecoverable(node.start, "Illegal 'use strict' directive in function with non-simple parameter list"); }
    }
    // Start a new scope with regard to labels and the `inFunction`
    // flag (restore them to their old value afterwards).
    var oldLabels = this.labels;
    this.labels = [];
    if (useStrict) { this.strict = true; }

    // Add the params to varDeclaredNames to ensure that an error is thrown
    // if a let/const declaration in the function clashes with one of the params.
    this.checkParams(node, !oldStrict && !useStrict && !isArrowFunction && this.isSimpleParamList(node.params));
    node.body = this.parseBlock(false);
    node.expression = false;
    this.labels = oldLabels;
  }
  this.exitFunctionScope();

  if (this.strict && node.id) {
    // Ensure the function name isn't a forbidden identifier in strict mode, e.g. 'eval'
    this.checkLVal(node.id, "none");
  }
  this.strict = oldStrict;
};

pp$3.isSimpleParamList = function(params) {
  for (var i = 0, list = params; i < list.length; i += 1)
    {
    var param = list[i];

    if (param.type !== "Identifier") { return false
  } }
  return true
};

// Checks function params for various disallowed patterns such as using "eval"
// or "arguments" and duplicate parameters.

pp$3.checkParams = function(node, allowDuplicates) {
  var this$1 = this;

  var nameHash = {};
  for (var i = 0, list = node.params; i < list.length; i += 1)
    {
    var param = list[i];

    this$1.checkLVal(param, "var", allowDuplicates ? null : nameHash);
  }
};

// Parses a comma-separated list of expressions, and returns them as
// an array. `close` is the token type that ends the list, and
// `allowEmpty` can be turned on to allow subsequent commas with
// nothing in between them to be parsed as `null` (which is needed
// for array literals).

pp$3.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
  var this$1 = this;

  var elts = [], first = true;
  while (!this.eat(close)) {
    if (!first) {
      this$1.expect(types.comma);
      if (allowTrailingComma && this$1.afterTrailingComma(close)) { break }
    } else { first = false; }

    var elt = (void 0);
    if (allowEmpty && this$1.type === types.comma)
      { elt = null; }
    else if (this$1.type === types.ellipsis) {
      elt = this$1.parseSpread(refDestructuringErrors);
      if (refDestructuringErrors && this$1.type === types.comma && refDestructuringErrors.trailingComma < 0)
        { refDestructuringErrors.trailingComma = this$1.start; }
    } else {
      elt = this$1.parseMaybeAssign(false, refDestructuringErrors);
    }
    elts.push(elt);
  }
  return elts
};

// Parse the next token as an identifier. If `liberal` is true (used
// when parsing properties), it will also convert keywords into
// identifiers.

pp$3.checkUnreserved = function(ref) {
  var start = ref.start;
  var end = ref.end;
  var name = ref.name;

  if (this.inGenerator && name === "yield")
    { this.raiseRecoverable(start, "Can not use 'yield' as identifier inside a generator"); }
  if (this.inAsync && name === "await")
    { this.raiseRecoverable(start, "Can not use 'await' as identifier inside an async function"); }
  if (this.isKeyword(name))
    { this.raise(start, ("Unexpected keyword '" + name + "'")); }
  if (this.options.ecmaVersion < 6 &&
    this.input.slice(start, end).indexOf("\\") != -1) { return }
  var re = this.strict ? this.reservedWordsStrict : this.reservedWords;
  if (re.test(name))
    { this.raiseRecoverable(start, ("The keyword '" + name + "' is reserved")); }
};

pp$3.parseIdent = function(liberal, isBinding) {
  var node = this.startNode();
  if (liberal && this.options.allowReserved == "never") { liberal = false; }
  if (this.type === types.name) {
    node.name = this.value;
  } else if (this.type.keyword) {
    node.name = this.type.keyword;
  } else {
    this.unexpected();
  }
  this.next();
  this.finishNode(node, "Identifier");
  if (!liberal) { this.checkUnreserved(node); }
  return node
};

// Parses yield expression inside generator.

pp$3.parseYield = function() {
  if (!this.yieldPos) { this.yieldPos = this.start; }

  var node = this.startNode();
  this.next();
  if (this.type == types.semi || this.canInsertSemicolon() || (this.type != types.star && !this.type.startsExpr)) {
    node.delegate = false;
    node.argument = null;
  } else {
    node.delegate = this.eat(types.star);
    node.argument = this.parseMaybeAssign();
  }
  return this.finishNode(node, "YieldExpression")
};

pp$3.parseAwait = function() {
  if (!this.awaitPos) { this.awaitPos = this.start; }

  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeUnary(null, true);
  return this.finishNode(node, "AwaitExpression")
};

var pp$4 = Parser.prototype;

// This function is used to raise exceptions on parse errors. It
// takes an offset integer (into the current `input`) to indicate
// the location of the error, attaches the position to the end
// of the error message, and then raises a `SyntaxError` with that
// message.

pp$4.raise = function(pos, message) {
  var loc = getLineInfo(this.input, pos);
  message += " (" + loc.line + ":" + loc.column + ")";
  var err = new SyntaxError(message);
  err.pos = pos; err.loc = loc; err.raisedAt = this.pos;
  throw err
};

pp$4.raiseRecoverable = pp$4.raise;

pp$4.curPosition = function() {
  if (this.options.locations) {
    return new Position(this.curLine, this.pos - this.lineStart)
  }
};

var pp$5 = Parser.prototype;

// Object.assign polyfill
var assign = Object.assign || function(target) {
  var sources = [], len = arguments.length - 1;
  while ( len-- > 0 ) sources[ len ] = arguments[ len + 1 ];

  for (var i = 0, list = sources; i < list.length; i += 1) {
    var source = list[i];

    for (var key in source) {
      if (has(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target
};

// The functions in this module keep track of declared variables in the current scope in order to detect duplicate variable names.

pp$5.enterFunctionScope = function() {
  // var: a hash of var-declared names in the current lexical scope
  // lexical: a hash of lexically-declared names in the current lexical scope
  // childVar: a hash of var-declared names in all child lexical scopes of the current lexical scope (within the current function scope)
  // parentLexical: a hash of lexically-declared names in all parent lexical scopes of the current lexical scope (within the current function scope)
  this.scopeStack.push({var: {}, lexical: {}, childVar: {}, parentLexical: {}});
};

pp$5.exitFunctionScope = function() {
  this.scopeStack.pop();
};

pp$5.enterLexicalScope = function() {
  var parentScope = this.scopeStack[this.scopeStack.length - 1];
  var childScope = {var: {}, lexical: {}, childVar: {}, parentLexical: {}};

  this.scopeStack.push(childScope);
  assign(childScope.parentLexical, parentScope.lexical, parentScope.parentLexical);
};

pp$5.exitLexicalScope = function() {
  var childScope = this.scopeStack.pop();
  var parentScope = this.scopeStack[this.scopeStack.length - 1];

  assign(parentScope.childVar, childScope.var, childScope.childVar);
};

/**
 * A name can be declared with `var` if there are no variables with the same name declared with `let`/`const`
 * in the current lexical scope or any of the parent lexical scopes in this function.
 */
pp$5.canDeclareVarName = function(name) {
  var currentScope = this.scopeStack[this.scopeStack.length - 1];

  return !has(currentScope.lexical, name) && !has(currentScope.parentLexical, name)
};

/**
 * A name can be declared with `let`/`const` if there are no variables with the same name declared with `let`/`const`
 * in the current scope, and there are no variables with the same name declared with `var` in the current scope or in
 * any child lexical scopes in this function.
 */
pp$5.canDeclareLexicalName = function(name) {
  var currentScope = this.scopeStack[this.scopeStack.length - 1];

  return !has(currentScope.lexical, name) && !has(currentScope.var, name) && !has(currentScope.childVar, name)
};

pp$5.declareVarName = function(name) {
  this.scopeStack[this.scopeStack.length - 1].var[name] = true;
};

pp$5.declareLexicalName = function(name) {
  this.scopeStack[this.scopeStack.length - 1].lexical[name] = true;
};

var Node = function Node(parser, pos, loc) {
  this.type = "";
  this.start = pos;
  this.end = 0;
  if (parser.options.locations)
    { this.loc = new SourceLocation(parser, loc); }
  if (parser.options.directSourceFile)
    { this.sourceFile = parser.options.directSourceFile; }
  if (parser.options.ranges)
    { this.range = [pos, 0]; }
};

// Start an AST node, attaching a start offset.

var pp$6 = Parser.prototype;

pp$6.startNode = function() {
  return new Node(this, this.start, this.startLoc)
};

pp$6.startNodeAt = function(pos, loc) {
  return new Node(this, pos, loc)
};

// Finish an AST node, adding `type` and `end` properties.

function finishNodeAt(node, type, pos, loc) {
  node.type = type;
  node.end = pos;
  if (this.options.locations)
    { node.loc.end = loc; }
  if (this.options.ranges)
    { node.range[1] = pos; }
  return node
}

pp$6.finishNode = function(node, type) {
  return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc)
};

// Finish node at given position

pp$6.finishNodeAt = function(node, type, pos, loc) {
  return finishNodeAt.call(this, node, type, pos, loc)
};

// The algorithm used to determine whether a regexp can appear at a
// given point in the program is loosely based on sweet.js' approach.
// See https://github.com/mozilla/sweet.js/wiki/design

var TokContext = function TokContext(token, isExpr, preserveSpace, override, generator) {
  this.token = token;
  this.isExpr = !!isExpr;
  this.preserveSpace = !!preserveSpace;
  this.override = override;
  this.generator = !!generator;
};

var types$1 = {
  b_stat: new TokContext("{", false),
  b_expr: new TokContext("{", true),
  b_tmpl: new TokContext("${", false),
  p_stat: new TokContext("(", false),
  p_expr: new TokContext("(", true),
  q_tmpl: new TokContext("`", true, true, function (p) { return p.tryReadTemplateToken(); }),
  f_stat: new TokContext("function", false),
  f_expr: new TokContext("function", true),
  f_expr_gen: new TokContext("function", true, false, null, true),
  f_gen: new TokContext("function", false, false, null, true)
};

var pp$7 = Parser.prototype;

pp$7.initialContext = function() {
  return [types$1.b_stat]
};

pp$7.braceIsBlock = function(prevType) {
  var parent = this.curContext();
  if (parent === types$1.f_expr || parent === types$1.f_stat)
    { return true }
  if (prevType === types.colon && (parent === types$1.b_stat || parent === types$1.b_expr))
    { return !parent.isExpr }

  // The check for `tt.name && exprAllowed` detects whether we are
  // after a `yield` or `of` construct. See the `updateContext` for
  // `tt.name`.
  if (prevType === types._return || prevType == types.name && this.exprAllowed)
    { return lineBreak.test(this.input.slice(this.lastTokEnd, this.start)) }
  if (prevType === types._else || prevType === types.semi || prevType === types.eof || prevType === types.parenR || prevType == types.arrow)
    { return true }
  if (prevType == types.braceL)
    { return parent === types$1.b_stat }
  if (prevType == types._var || prevType == types.name)
    { return false }
  return !this.exprAllowed
};

pp$7.inGeneratorContext = function() {
  var this$1 = this;

  for (var i = this.context.length - 1; i >= 1; i--) {
    var context = this$1.context[i];
    if (context.token === "function")
      { return context.generator }
  }
  return false
};

pp$7.updateContext = function(prevType) {
  var update, type = this.type;
  if (type.keyword && prevType == types.dot)
    { this.exprAllowed = false; }
  else if (update = type.updateContext)
    { update.call(this, prevType); }
  else
    { this.exprAllowed = type.beforeExpr; }
};

// Token-specific context update code

types.parenR.updateContext = types.braceR.updateContext = function() {
  if (this.context.length == 1) {
    this.exprAllowed = true;
    return
  }
  var out = this.context.pop();
  if (out === types$1.b_stat && this.curContext().token === "function") {
    out = this.context.pop();
  }
  this.exprAllowed = !out.isExpr;
};

types.braceL.updateContext = function(prevType) {
  this.context.push(this.braceIsBlock(prevType) ? types$1.b_stat : types$1.b_expr);
  this.exprAllowed = true;
};

types.dollarBraceL.updateContext = function() {
  this.context.push(types$1.b_tmpl);
  this.exprAllowed = true;
};

types.parenL.updateContext = function(prevType) {
  var statementParens = prevType === types._if || prevType === types._for || prevType === types._with || prevType === types._while;
  this.context.push(statementParens ? types$1.p_stat : types$1.p_expr);
  this.exprAllowed = true;
};

types.incDec.updateContext = function() {
  // tokExprAllowed stays unchanged
};

types._function.updateContext = types._class.updateContext = function(prevType) {
  if (prevType.beforeExpr && prevType !== types.semi && prevType !== types._else &&
      !((prevType === types.colon || prevType === types.braceL) && this.curContext() === types$1.b_stat))
    { this.context.push(types$1.f_expr); }
  else
    { this.context.push(types$1.f_stat); }
  this.exprAllowed = false;
};

types.backQuote.updateContext = function() {
  if (this.curContext() === types$1.q_tmpl)
    { this.context.pop(); }
  else
    { this.context.push(types$1.q_tmpl); }
  this.exprAllowed = false;
};

types.star.updateContext = function(prevType) {
  if (prevType == types._function) {
    var index = this.context.length - 1;
    if (this.context[index] === types$1.f_expr)
      { this.context[index] = types$1.f_expr_gen; }
    else
      { this.context[index] = types$1.f_gen; }
  }
  this.exprAllowed = true;
};

types.name.updateContext = function(prevType) {
  var allowed = false;
  if (this.options.ecmaVersion >= 6) {
    if (this.value == "of" && !this.exprAllowed ||
        this.value == "yield" && this.inGeneratorContext())
      { allowed = true; }
  }
  this.exprAllowed = allowed;
};

// Object type used to represent tokens. Note that normally, tokens
// simply exist as properties on the parser object. This is only
// used for the onToken callback and the external tokenizer.

var Token = function Token(p) {
  this.type = p.type;
  this.value = p.value;
  this.start = p.start;
  this.end = p.end;
  if (p.options.locations)
    { this.loc = new SourceLocation(p, p.startLoc, p.endLoc); }
  if (p.options.ranges)
    { this.range = [p.start, p.end]; }
};

// ## Tokenizer

var pp$8 = Parser.prototype;

// Are we running under Rhino?
var isRhino = typeof Packages == "object" && Object.prototype.toString.call(Packages) == "[object JavaPackage]";

// Move to the next token

pp$8.next = function() {
  if (this.options.onToken)
    { this.options.onToken(new Token(this)); }

  this.lastTokEnd = this.end;
  this.lastTokStart = this.start;
  this.lastTokEndLoc = this.endLoc;
  this.lastTokStartLoc = this.startLoc;
  this.nextToken();
};

pp$8.getToken = function() {
  this.next();
  return new Token(this)
};

// If we're in an ES6 environment, make parsers iterable
if (typeof Symbol !== "undefined")
  { pp$8[Symbol.iterator] = function() {
    var this$1 = this;

    return {
      next: function () {
        var token = this$1.getToken();
        return {
          done: token.type === types.eof,
          value: token
        }
      }
    }
  }; }

// Toggle strict mode. Re-reads the next number or string to please
// pedantic tests (`"use strict"; 010;` should fail).

pp$8.curContext = function() {
  return this.context[this.context.length - 1]
};

// Read a single token, updating the parser object's token-related
// properties.

pp$8.nextToken = function() {
  var curContext = this.curContext();
  if (!curContext || !curContext.preserveSpace) { this.skipSpace(); }

  this.start = this.pos;
  if (this.options.locations) { this.startLoc = this.curPosition(); }
  if (this.pos >= this.input.length) { return this.finishToken(types.eof) }

  if (curContext.override) { return curContext.override(this) }
  else { this.readToken(this.fullCharCodeAtPos()); }
};

pp$8.readToken = function(code) {
  // Identifier or keyword. '\uXXXX' sequences are allowed in
  // identifiers, so '\' also dispatches to that.
  if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92 /* '\' */)
    { return this.readWord() }

  return this.getTokenFromCode(code)
};

pp$8.fullCharCodeAtPos = function() {
  var code = this.input.charCodeAt(this.pos);
  if (code <= 0xd7ff || code >= 0xe000) { return code }
  var next = this.input.charCodeAt(this.pos + 1);
  return (code << 10) + next - 0x35fdc00
};

pp$8.skipBlockComment = function() {
  var this$1 = this;

  var startLoc = this.options.onComment && this.curPosition();
  var start = this.pos, end = this.input.indexOf("*/", this.pos += 2);
  if (end === -1) { this.raise(this.pos - 2, "Unterminated comment"); }
  this.pos = end + 2;
  if (this.options.locations) {
    lineBreakG.lastIndex = start;
    var match;
    while ((match = lineBreakG.exec(this.input)) && match.index < this.pos) {
      ++this$1.curLine;
      this$1.lineStart = match.index + match[0].length;
    }
  }
  if (this.options.onComment)
    { this.options.onComment(true, this.input.slice(start + 2, end), start, this.pos,
                           startLoc, this.curPosition()); }
};

pp$8.skipLineComment = function(startSkip) {
  var this$1 = this;

  var start = this.pos;
  var startLoc = this.options.onComment && this.curPosition();
  var ch = this.input.charCodeAt(this.pos += startSkip);
  while (this.pos < this.input.length && !isNewLine(ch)) {
    ch = this$1.input.charCodeAt(++this$1.pos);
  }
  if (this.options.onComment)
    { this.options.onComment(false, this.input.slice(start + startSkip, this.pos), start, this.pos,
                           startLoc, this.curPosition()); }
};

// Called at the start of the parse and after every token. Skips
// whitespace and comments, and.

pp$8.skipSpace = function() {
  var this$1 = this;

  loop: while (this.pos < this.input.length) {
    var ch = this$1.input.charCodeAt(this$1.pos);
    switch (ch) {
    case 32: case 160: // ' '
      ++this$1.pos;
      break
    case 13:
      if (this$1.input.charCodeAt(this$1.pos + 1) === 10) {
        ++this$1.pos;
      }
    case 10: case 8232: case 8233:
      ++this$1.pos;
      if (this$1.options.locations) {
        ++this$1.curLine;
        this$1.lineStart = this$1.pos;
      }
      break
    case 47: // '/'
      switch (this$1.input.charCodeAt(this$1.pos + 1)) {
      case 42: // '*'
        this$1.skipBlockComment();
        break
      case 47:
        this$1.skipLineComment(2);
        break
      default:
        break loop
      }
      break
    default:
      if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
        ++this$1.pos;
      } else {
        break loop
      }
    }
  }
};

// Called at the end of every token. Sets `end`, `val`, and
// maintains `context` and `exprAllowed`, and skips the space after
// the token, so that the next one's `start` will point at the
// right position.

pp$8.finishToken = function(type, val) {
  this.end = this.pos;
  if (this.options.locations) { this.endLoc = this.curPosition(); }
  var prevType = this.type;
  this.type = type;
  this.value = val;

  this.updateContext(prevType);
};

// ### Token reading

// This is the function that is called to fetch the next token. It
// is somewhat obscure, because it works in character codes rather
// than characters, and because operator parsing has been inlined
// into it.
//
// All in the name of speed.
//
pp$8.readToken_dot = function() {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next >= 48 && next <= 57) { return this.readNumber(true) }
  var next2 = this.input.charCodeAt(this.pos + 2);
  if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) { // 46 = dot '.'
    this.pos += 3;
    return this.finishToken(types.ellipsis)
  } else {
    ++this.pos;
    return this.finishToken(types.dot)
  }
};

pp$8.readToken_slash = function() { // '/'
  var next = this.input.charCodeAt(this.pos + 1);
  if (this.exprAllowed) { ++this.pos; return this.readRegexp() }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.slash, 1)
};

pp$8.readToken_mult_modulo_exp = function(code) { // '%*'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  var tokentype = code === 42 ? types.star : types.modulo;

  // exponentiation operator ** and **=
  if (this.options.ecmaVersion >= 7 && next === 42) {
    ++size;
    tokentype = types.starstar;
    next = this.input.charCodeAt(this.pos + 2);
  }

  if (next === 61) { return this.finishOp(types.assign, size + 1) }
  return this.finishOp(tokentype, size)
};

pp$8.readToken_pipe_amp = function(code) { // '|&'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) { return this.finishOp(code === 124 ? types.logicalOR : types.logicalAND, 2) }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(code === 124 ? types.bitwiseOR : types.bitwiseAND, 1)
};

pp$8.readToken_caret = function() { // '^'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.bitwiseXOR, 1)
};

pp$8.readToken_plus_min = function(code) { // '+-'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (next == 45 && this.input.charCodeAt(this.pos + 2) == 62 &&
        (this.lastTokEnd === 0 || lineBreak.test(this.input.slice(this.lastTokEnd, this.pos)))) {
      // A `-->` line comment
      this.skipLineComment(3);
      this.skipSpace();
      return this.nextToken()
    }
    return this.finishOp(types.incDec, 2)
  }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.plusMin, 1)
};

pp$8.readToken_lt_gt = function(code) { // '<>'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  if (next === code) {
    size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
    if (this.input.charCodeAt(this.pos + size) === 61) { return this.finishOp(types.assign, size + 1) }
    return this.finishOp(types.bitShift, size)
  }
  if (next == 33 && code == 60 && this.input.charCodeAt(this.pos + 2) == 45 &&
      this.input.charCodeAt(this.pos + 3) == 45) {
    if (this.inModule) { this.unexpected(); }
    // `<!--`, an XML-style comment that should be interpreted as a line comment
    this.skipLineComment(4);
    this.skipSpace();
    return this.nextToken()
  }
  if (next === 61) { size = 2; }
  return this.finishOp(types.relational, size)
};

pp$8.readToken_eq_excl = function(code) { // '=!'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) { return this.finishOp(types.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2) }
  if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) { // '=>'
    this.pos += 2;
    return this.finishToken(types.arrow)
  }
  return this.finishOp(code === 61 ? types.eq : types.prefix, 1)
};

pp$8.getTokenFromCode = function(code) {
  switch (code) {
    // The interpretation of a dot depends on whether it is followed
    // by a digit or another two dots.
  case 46: // '.'
    return this.readToken_dot()

    // Punctuation tokens.
  case 40: ++this.pos; return this.finishToken(types.parenL)
  case 41: ++this.pos; return this.finishToken(types.parenR)
  case 59: ++this.pos; return this.finishToken(types.semi)
  case 44: ++this.pos; return this.finishToken(types.comma)
  case 91: ++this.pos; return this.finishToken(types.bracketL)
  case 93: ++this.pos; return this.finishToken(types.bracketR)
  case 123: ++this.pos; return this.finishToken(types.braceL)
  case 125: ++this.pos; return this.finishToken(types.braceR)
  case 58: ++this.pos; return this.finishToken(types.colon)
  case 63: ++this.pos; return this.finishToken(types.question)

  case 96: // '`'
    if (this.options.ecmaVersion < 6) { break }
    ++this.pos;
    return this.finishToken(types.backQuote)

  case 48: // '0'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 120 || next === 88) { return this.readRadixNumber(16) } // '0x', '0X' - hex number
    if (this.options.ecmaVersion >= 6) {
      if (next === 111 || next === 79) { return this.readRadixNumber(8) } // '0o', '0O' - octal number
      if (next === 98 || next === 66) { return this.readRadixNumber(2) } // '0b', '0B' - binary number
    }
    // Anything else beginning with a digit is an integer, octal
    // number, or float.
  case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
    return this.readNumber(false)

    // Quotes produce strings.
  case 34: case 39: // '"', "'"
    return this.readString(code)

    // Operators are parsed inline in tiny state machines. '=' (61) is
    // often referred to. `finishOp` simply skips the amount of
    // characters it is given as second argument, and returns a token
    // of the type given by its first argument.

  case 47: // '/'
    return this.readToken_slash()

  case 37: case 42: // '%*'
    return this.readToken_mult_modulo_exp(code)

  case 124: case 38: // '|&'
    return this.readToken_pipe_amp(code)

  case 94: // '^'
    return this.readToken_caret()

  case 43: case 45: // '+-'
    return this.readToken_plus_min(code)

  case 60: case 62: // '<>'
    return this.readToken_lt_gt(code)

  case 61: case 33: // '=!'
    return this.readToken_eq_excl(code)

  case 126: // '~'
    return this.finishOp(types.prefix, 1)
  }

  this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
};

pp$8.finishOp = function(type, size) {
  var str = this.input.slice(this.pos, this.pos + size);
  this.pos += size;
  return this.finishToken(type, str)
};

// Parse a regular expression. Some context-awareness is necessary,
// since a '/' inside a '[]' set does not end the expression.

function tryCreateRegexp(src, flags, throwErrorAt, parser) {
  try {
    return new RegExp(src, flags)
  } catch (e) {
    if (throwErrorAt !== undefined) {
      if (e instanceof SyntaxError) { parser.raise(throwErrorAt, "Error parsing regular expression: " + e.message); }
      throw e
    }
  }
}

var regexpUnicodeSupport = !!tryCreateRegexp("\uffff", "u");

pp$8.readRegexp = function() {
  var this$1 = this;

  var escaped, inClass, start = this.pos;
  for (;;) {
    if (this$1.pos >= this$1.input.length) { this$1.raise(start, "Unterminated regular expression"); }
    var ch = this$1.input.charAt(this$1.pos);
    if (lineBreak.test(ch)) { this$1.raise(start, "Unterminated regular expression"); }
    if (!escaped) {
      if (ch === "[") { inClass = true; }
      else if (ch === "]" && inClass) { inClass = false; }
      else if (ch === "/" && !inClass) { break }
      escaped = ch === "\\";
    } else { escaped = false; }
    ++this$1.pos;
  }
  var content = this.input.slice(start, this.pos);
  ++this.pos;
  // Need to use `readWord1` because '\uXXXX' sequences are allowed
  // here (don't ask).
  var mods = this.readWord1();
  var tmp = content, tmpFlags = "";
  if (mods) {
    var validFlags = /^[gim]*$/;
    if (this.options.ecmaVersion >= 6) { validFlags = /^[gimuy]*$/; }
    if (!validFlags.test(mods)) { this.raise(start, "Invalid regular expression flag"); }
    if (mods.indexOf("u") >= 0) {
      if (regexpUnicodeSupport) {
        tmpFlags = "u";
      } else {
        // Replace each astral symbol and every Unicode escape sequence that
        // possibly represents an astral symbol or a paired surrogate with a
        // single ASCII symbol to avoid throwing on regular expressions that
        // are only valid in combination with the `/u` flag.
        // Note: replacing with the ASCII symbol `x` might cause false
        // negatives in unlikely scenarios. For example, `[\u{61}-b]` is a
        // perfectly valid pattern that is equivalent to `[a-b]`, but it would
        // be replaced by `[x-b]` which throws an error.
        tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}/g, function (_match, code, offset) {
          code = Number("0x" + code);
          if (code > 0x10FFFF) { this$1.raise(start + offset + 3, "Code point out of bounds"); }
          return "x"
        });
        tmp = tmp.replace(/\\u([a-fA-F0-9]{4})|[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "x");
        tmpFlags = tmpFlags.replace("u", "");
      }
    }
  }
  // Detect invalid regular expressions.
  var value = null;
  // Rhino's regular expression parser is flaky and throws uncatchable exceptions,
  // so don't do detection if we are running under Rhino
  if (!isRhino) {
    tryCreateRegexp(tmp, tmpFlags, start, this);
    // Get a regular expression object for this pattern-flag pair, or `null` in
    // case the current environment doesn't support the flags it uses.
    value = tryCreateRegexp(content, mods);
  }
  return this.finishToken(types.regexp, {pattern: content, flags: mods, value: value})
};

// Read an integer in the given radix. Return null if zero digits
// were read, the integer value otherwise. When `len` is given, this
// will return `null` unless the integer has exactly `len` digits.

pp$8.readInt = function(radix, len) {
  var this$1 = this;

  var start = this.pos, total = 0;
  for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
    var code = this$1.input.charCodeAt(this$1.pos), val = (void 0);
    if (code >= 97) { val = code - 97 + 10; } // a
    else if (code >= 65) { val = code - 65 + 10; } // A
    else if (code >= 48 && code <= 57) { val = code - 48; } // 0-9
    else { val = Infinity; }
    if (val >= radix) { break }
    ++this$1.pos;
    total = total * radix + val;
  }
  if (this.pos === start || len != null && this.pos - start !== len) { return null }

  return total
};

pp$8.readRadixNumber = function(radix) {
  this.pos += 2; // 0x
  var val = this.readInt(radix);
  if (val == null) { this.raise(this.start + 2, "Expected number in radix " + radix); }
  if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
  return this.finishToken(types.num, val)
};

// Read an integer, octal integer, or floating-point number.

pp$8.readNumber = function(startsWithDot) {
  var start = this.pos, isFloat = false, octal = this.input.charCodeAt(this.pos) === 48;
  if (!startsWithDot && this.readInt(10) === null) { this.raise(start, "Invalid number"); }
  if (octal && this.pos == start + 1) { octal = false; }
  var next = this.input.charCodeAt(this.pos);
  if (next === 46 && !octal) { // '.'
    ++this.pos;
    this.readInt(10);
    isFloat = true;
    next = this.input.charCodeAt(this.pos);
  }
  if ((next === 69 || next === 101) && !octal) { // 'eE'
    next = this.input.charCodeAt(++this.pos);
    if (next === 43 || next === 45) { ++this.pos; } // '+-'
    if (this.readInt(10) === null) { this.raise(start, "Invalid number"); }
    isFloat = true;
  }
  if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }

  var str = this.input.slice(start, this.pos), val;
  if (isFloat) { val = parseFloat(str); }
  else if (!octal || str.length === 1) { val = parseInt(str, 10); }
  else if (this.strict) { this.raise(start, "Invalid number"); }
  else if (/[89]/.test(str)) { val = parseInt(str, 10); }
  else { val = parseInt(str, 8); }
  return this.finishToken(types.num, val)
};

// Read a string value, interpreting backslash-escapes.

pp$8.readCodePoint = function() {
  var ch = this.input.charCodeAt(this.pos), code;

  if (ch === 123) { // '{'
    if (this.options.ecmaVersion < 6) { this.unexpected(); }
    var codePos = ++this.pos;
    code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
    ++this.pos;
    if (code > 0x10FFFF) { this.invalidStringToken(codePos, "Code point out of bounds"); }
  } else {
    code = this.readHexChar(4);
  }
  return code
};

function codePointToString(code) {
  // UTF-16 Decoding
  if (code <= 0xFFFF) { return String.fromCharCode(code) }
  code -= 0x10000;
  return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00)
}

pp$8.readString = function(quote) {
  var this$1 = this;

  var out = "", chunkStart = ++this.pos;
  for (;;) {
    if (this$1.pos >= this$1.input.length) { this$1.raise(this$1.start, "Unterminated string constant"); }
    var ch = this$1.input.charCodeAt(this$1.pos);
    if (ch === quote) { break }
    if (ch === 92) { // '\'
      out += this$1.input.slice(chunkStart, this$1.pos);
      out += this$1.readEscapedChar(false);
      chunkStart = this$1.pos;
    } else {
      if (isNewLine(ch)) { this$1.raise(this$1.start, "Unterminated string constant"); }
      ++this$1.pos;
    }
  }
  out += this.input.slice(chunkStart, this.pos++);
  return this.finishToken(types.string, out)
};

// Reads template string tokens.

var INVALID_TEMPLATE_ESCAPE_ERROR = {};

pp$8.tryReadTemplateToken = function() {
  this.inTemplateElement = true;
  try {
    this.readTmplToken();
  } catch (err) {
    if (err === INVALID_TEMPLATE_ESCAPE_ERROR) {
      this.readInvalidTemplateToken();
    } else {
      throw err
    }
  }

  this.inTemplateElement = false;
};

pp$8.invalidStringToken = function(position, message) {
  if (this.inTemplateElement && this.options.ecmaVersion >= 9) {
    throw INVALID_TEMPLATE_ESCAPE_ERROR
  } else {
    this.raise(position, message);
  }
};

pp$8.readTmplToken = function() {
  var this$1 = this;

  var out = "", chunkStart = this.pos;
  for (;;) {
    if (this$1.pos >= this$1.input.length) { this$1.raise(this$1.start, "Unterminated template"); }
    var ch = this$1.input.charCodeAt(this$1.pos);
    if (ch === 96 || ch === 36 && this$1.input.charCodeAt(this$1.pos + 1) === 123) { // '`', '${'
      if (this$1.pos === this$1.start && (this$1.type === types.template || this$1.type === types.invalidTemplate)) {
        if (ch === 36) {
          this$1.pos += 2;
          return this$1.finishToken(types.dollarBraceL)
        } else {
          ++this$1.pos;
          return this$1.finishToken(types.backQuote)
        }
      }
      out += this$1.input.slice(chunkStart, this$1.pos);
      return this$1.finishToken(types.template, out)
    }
    if (ch === 92) { // '\'
      out += this$1.input.slice(chunkStart, this$1.pos);
      out += this$1.readEscapedChar(true);
      chunkStart = this$1.pos;
    } else if (isNewLine(ch)) {
      out += this$1.input.slice(chunkStart, this$1.pos);
      ++this$1.pos;
      switch (ch) {
      case 13:
        if (this$1.input.charCodeAt(this$1.pos) === 10) { ++this$1.pos; }
      case 10:
        out += "\n";
        break
      default:
        out += String.fromCharCode(ch);
        break
      }
      if (this$1.options.locations) {
        ++this$1.curLine;
        this$1.lineStart = this$1.pos;
      }
      chunkStart = this$1.pos;
    } else {
      ++this$1.pos;
    }
  }
};

// Reads a template token to search for the end, without validating any escape sequences
pp$8.readInvalidTemplateToken = function() {
  var this$1 = this;

  for (; this.pos < this.input.length; this.pos++) {
    switch (this$1.input[this$1.pos]) {
    case "\\":
      ++this$1.pos;
      break

    case "$":
      if (this$1.input[this$1.pos + 1] !== "{") {
        break
      }
    // falls through

    case "`":
      return this$1.finishToken(types.invalidTemplate, this$1.input.slice(this$1.start, this$1.pos))

    // no default
    }
  }
  this.raise(this.start, "Unterminated template");
};

// Used to read escaped characters

pp$8.readEscapedChar = function(inTemplate) {
  var ch = this.input.charCodeAt(++this.pos);
  ++this.pos;
  switch (ch) {
  case 110: return "\n" // 'n' -> '\n'
  case 114: return "\r" // 'r' -> '\r'
  case 120: return String.fromCharCode(this.readHexChar(2)) // 'x'
  case 117: return codePointToString(this.readCodePoint()) // 'u'
  case 116: return "\t" // 't' -> '\t'
  case 98: return "\b" // 'b' -> '\b'
  case 118: return "\u000b" // 'v' -> '\u000b'
  case 102: return "\f" // 'f' -> '\f'
  case 13: if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; } // '\r\n'
  case 10: // ' \n'
    if (this.options.locations) { this.lineStart = this.pos; ++this.curLine; }
    return ""
  default:
    if (ch >= 48 && ch <= 55) {
      var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
      var octal = parseInt(octalStr, 8);
      if (octal > 255) {
        octalStr = octalStr.slice(0, -1);
        octal = parseInt(octalStr, 8);
      }
      if (octalStr !== "0" && (this.strict || inTemplate)) {
        this.invalidStringToken(this.pos - 2, "Octal literal in strict mode");
      }
      this.pos += octalStr.length - 1;
      return String.fromCharCode(octal)
    }
    return String.fromCharCode(ch)
  }
};

// Used to read character escape sequences ('\x', '\u', '\U').

pp$8.readHexChar = function(len) {
  var codePos = this.pos;
  var n = this.readInt(16, len);
  if (n === null) { this.invalidStringToken(codePos, "Bad character escape sequence"); }
  return n
};

// Read an identifier, and return it as a string. Sets `this.containsEsc`
// to whether the word contained a '\u' escape.
//
// Incrementally adds only escaped chars, adding other chunks as-is
// as a micro-optimization.

pp$8.readWord1 = function() {
  var this$1 = this;

  this.containsEsc = false;
  var word = "", first = true, chunkStart = this.pos;
  var astral = this.options.ecmaVersion >= 6;
  while (this.pos < this.input.length) {
    var ch = this$1.fullCharCodeAtPos();
    if (isIdentifierChar(ch, astral)) {
      this$1.pos += ch <= 0xffff ? 1 : 2;
    } else if (ch === 92) { // "\"
      this$1.containsEsc = true;
      word += this$1.input.slice(chunkStart, this$1.pos);
      var escStart = this$1.pos;
      if (this$1.input.charCodeAt(++this$1.pos) != 117) // "u"
        { this$1.invalidStringToken(this$1.pos, "Expecting Unicode escape sequence \\uXXXX"); }
      ++this$1.pos;
      var esc = this$1.readCodePoint();
      if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral))
        { this$1.invalidStringToken(escStart, "Invalid Unicode escape"); }
      word += codePointToString(esc);
      chunkStart = this$1.pos;
    } else {
      break
    }
    first = false;
  }
  return word + this.input.slice(chunkStart, this.pos)
};

// Read an identifier or keyword token. Will check for reserved
// words when necessary.

pp$8.readWord = function() {
  var word = this.readWord1();
  var type = types.name;
  if (this.keywords.test(word)) {
    if (this.containsEsc) { this.raiseRecoverable(this.start, "Escape sequence in keyword " + word); }
    type = keywords$1[word];
  }
  return this.finishToken(type, word)
};

// Acorn is a tiny, fast JavaScript parser written in JavaScript.
//
// Acorn was written by Marijn Haverbeke, Ingvar Stepanyan, and
// various contributors and released under an MIT license.
//
// Git repositories for Acorn are available at
//
//     http://marijnhaverbeke.nl/git/acorn
//     https://github.com/ternjs/acorn.git
//
// Please use the [github bug tracker][ghbt] to report issues.
//
// [ghbt]: https://github.com/ternjs/acorn/issues
//
// This file defines the main parser interface. The library also comes
// with a [error-tolerant parser][dammit] and an
// [abstract syntax tree walker][walk], defined in other files.
//
// [dammit]: acorn_loose.js
// [walk]: util/walk.js

var version = "5.1.1";

// The main exported interface (under `self.acorn` when in the
// browser) is a `parse` function that takes a code string and
// returns an abstract syntax tree as specified by [Mozilla parser
// API][api].
//
// [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

function parse(input, options) {
  return new Parser(options, input).parse()
}

// This function tries to parse a single expression at a given
// offset in a string. Useful for parsing mixed-language formats
// that embed JavaScript expressions.

function parseExpressionAt(input, pos, options) {
  var p = new Parser(options, input, pos);
  p.nextToken();
  return p.parseExpression()
}

// Acorn is organized as a tokenizer and a recursive-descent parser.
// The `tokenizer` export provides an interface to the tokenizer.

function tokenizer(input, options) {
  return new Parser(options, input)
}

// This is a terrible kludge to support the existing, pre-ES6
// interface where the loose parser module retroactively adds exports
// to this module.
var parse_dammit;
var LooseParser;
var pluginsLoose; // eslint-disable-line camelcase
function addLooseExports(parse, Parser$$1, plugins$$1) {
  parse_dammit = parse; // eslint-disable-line camelcase
  LooseParser = Parser$$1;
  pluginsLoose = plugins$$1;
}




/***/ })
/******/ ]);
//# sourceMappingURL=interpreter.global.js.map