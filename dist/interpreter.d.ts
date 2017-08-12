/// <reference path="../lib/_estree.d.ts" />
/**
 * @license
 * JavaScript Interpreter
 *
 * Copyright 2013-2017 Google Inc. and Jun Kato
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
 * @author i@junkato.jp (Jun Kato)
 */
/**
 * Create a new interpreter.
 * @param {string|!Object} code Raw JavaScript text or AST.
 * @param {Function=} opt_initFunc Optional initialization function.  Used to
 *     define APIs.  When called it is passed the interpreter object and the
 *     global scope object.
 * @constructor
 */
declare class Interpreter {
    static acorn: Interpreter.Acorn;
    private nodeConstructor;
    ast: ESTree.Program;
    global: Interpreter.MyObject;
    stateStack: Interpreter.MyState[];
    value: Interpreter.MyValue;
    private initFunc_;
    private paused_;
    private polyfills_;
    private functionCounter_;
    private stepFunctions_;
    OBJECT: Interpreter.MyObject;
    OBJECT_PROTO: Interpreter.MyObject;
    FUNCTION: Interpreter.MyObject;
    FUNCTION_PROTO: Interpreter.MyObject;
    ARRAY: Interpreter.MyObject;
    ARRAY_PROTO: Interpreter.MyObject;
    REGEXP: Interpreter.MyObject;
    REGEXP_PROTO: Interpreter.MyObject;
    ERROR: Interpreter.MyObject;
    EVAL_ERROR: Interpreter.MyObject;
    RANGE_ERROR: Interpreter.MyObject;
    REFERENCE_ERROR: Interpreter.MyObject;
    SYNTAX_ERROR: Interpreter.MyObject;
    TYPE_ERROR: Interpreter.MyObject;
    URI_ERROR: Interpreter.MyObject;
    STRING: Interpreter.MyObject;
    BOOLEAN: Interpreter.MyObject;
    NUMBER: Interpreter.MyObject;
    DATE: Interpreter.MyObject;
    UNDEFINED: Interpreter.MyObject;
    NULL: null;
    NAN: number;
    TRUE: boolean;
    FALSE: boolean;
    STRING_EMPTY: string;
    NUMBER_ZERO: number;
    NUMBER_ONE: number;
    constructor(code: string | ESTree.Program, opt_initFunc?: (i: Interpreter, scope: Interpreter.MyObject) => void);
    /**
     * @const {!Object} Configuration used for all Acorn parsing.
     */
    static PARSE_OPTIONS: {
        ecmaVersion: number;
    };
    /**
     * Property descriptor of readonly properties.
     */
    static READONLY_DESCRIPTOR: {
        configurable: boolean;
        enumerable: boolean;
        writable: boolean;
    };
    /**
     * Property descriptor of non-enumerable properties.
     */
    static NONENUMERABLE_DESCRIPTOR: {
        configurable: boolean;
        enumerable: boolean;
        writable: boolean;
    };
    /**
     * Property descriptor of readonly, non-enumerable properties.
     */
    static READONLY_NONENUMERABLE_DESCRIPTOR: {
        configurable: boolean;
        enumerable: boolean;
        writable: boolean;
    };
    /**
     * Property descriptor of variables.
     */
    static VARIABLE_DESCRIPTOR: {
        configurable: boolean;
        enumerable: boolean;
        writable: boolean;
    };
    /**
     * Unique symbol for indicating that a step has encountered an error, has
     * added it to the stack, and will be thrown within the user's program.
     * When STEP_ERROR is thrown in the JS-Interpreter, the error can be ignored.
     */
    static STEP_ERROR: {};
    /**
     * Unique symbol for indicating that a reference is a variable on the scope,
     * not an object property.
     */
    static SCOPE_REFERENCE: {};
    /**
     * For cycle detection in array to string and error conversion;
     * see spec bug github.com/tc39/ecma262/issues/289
     * Since this is for atomic actions only, it can be a class property.
     */
    static toStringCycles_: any[];
    /**
     * Add more code to the interpreter.
     * @param {string|!Object} code Raw JavaScript text or AST.
     */
    appendCode(code: string | ESTree.Node): void;
    /**
     * Execute one step of the interpreter.
     * @return {boolean} True if a step was executed, false if no more instructions.
     */
    step(): boolean;
    /**
     * Execute the interpreter to program completion.  Vulnerable to infinite loops.
     * @return {boolean} True if a execution is asynchronously blocked,
     *     false if no more instructions.
     */
    run(): boolean;
    /**
     * Initialize the global scope with buitin properties and functions.
     * @param {!Interpreter.MyObject} scope Global scope.
     */
    initGlobalScope(scope: Interpreter.MyObject): void;
    /**
     * Initialize the Function class.
     * @param {!Interpreter.MyObject} scope Global scope.
     */
    initFunction(scope: Interpreter.MyObject): void;
    /**
     * Initialize the Object class.
     * @param {!Interpreter.MyObject} scope Global scope.
     */
    initObject(scope: Interpreter.MyObject): void;
    /**
     * Initialize the Array class.
     * @param {!Interpreter.MyObject} scope Global scope.
     */
    initArray(scope: Interpreter.MyObject): void;
    /**
     * Initialize the String class.
     * @param {!Interpreter.MyObject} scope Global scope.
     */
    initString(scope: Interpreter.MyObject): void;
    /**
     * Initialize the Boolean class.
     * @param {!Interpreter.MyObject} scope Global scope.
     */
    initBoolean(scope: Interpreter.MyObject): void;
    /**
     * Initialize the Number class.
     * @param {!Interpreter.MyObject} scope Global scope.
     */
    initNumber(scope: Interpreter.MyObject): void;
    /**
     * Initialize the Date class.
     * @param {!Interpreter.MyObject} scope Global scope.
     */
    initDate(scope: Interpreter.MyObject): void;
    /**
     * Initialize Regular Expression object.
     * @param {!Interpreter.MyObject} scope Global scope.
     */
    initRegExp(scope: Interpreter.MyObject): void;
    /**
     * Initialize the Error class.
     * @param {!Interpreter.MyObject} scope Global scope.
     */
    initError(scope: Interpreter.MyObject): void;
    /**
     * Initialize Math object.
     * @param {!Interpreter.MyObject} scope Global scope.
     */
    initMath(scope: Interpreter.MyObject): void;
    /**
     * Initialize JSON object.
     * @param {!Interpreter.MyObject} scope Global scope.
     */
    initJSON(scope: Interpreter.MyObject): void;
    /**
     * Is an object of a certain class?
     * @param {Interpreter.MyValue} child Object to check.
     * @param {Interpreter.MyObject} constructor Constructor of object.
     * @return {boolean} True if object is the class or inherits from it.
     *     False otherwise.
     */
    isa(child: Interpreter.MyValue, constructor: Interpreter.MyObject): boolean;
    /**
     * Is a value a legal integer for an array length?
     * @param {Interpreter.MyValue} x Value to check.
     * @return {number} Zero, or a positive integer if the value can be
     *     converted to such.  NaN otherwise.
     */
    static legalArrayLength(x: Interpreter.MyValue): number;
    /**
     * Is a value a legal integer for an array index?
     * @param {Interpreter.MyValue} x Value to check.
     * @return {number} Zero, or a positive integer if the value can be
     *     converted to such.  NaN otherwise.
     */
    static legalArrayIndex(x: Interpreter.MyValue): number;
    /**
     * Create a new data object based on a constructor's prototype.
     * @param {Interpreter.MyObject} constructor Parent constructor function,
     *     or null if scope object.
     * @return {!Interpreter.MyObject} New data object.
     */
    createObject(constructor: Interpreter.MyObject): Interpreter.MyObject;
    /**
     * Create a new data object based on a prototype.
     * @param {Interpreter.MyObject} proto Prototype object.
     * @return {!Interpreter.MyObject} New data object.
     */
    createObjectProto(proto: Interpreter.MyObject): Interpreter.MyObject;
    /**
     * Initialize a pseudo regular expression object based on a native regular
     * expression object.
     * @param {!Interpreter.MyObject} pseudoRegexp The existing object to set.
     * @param {!RegExp} nativeRegexp The native regular expression.
     */
    populateRegExp(pseudoRegexp: Interpreter.MyObject, nativeRegexp: RegExp): void;
    /**
     * Create a new function.
     * @param {!Object} node AST node defining the function.
     * @param {!Object} scope Parent scope.
     * @return {!Interpreter.MyObject} New function.
     */
    createFunction(node: ESTree.FunctionDeclaration, scope: Interpreter.MyObject): Interpreter.MyObject;
    /**
     * Create a new native function.
     * @param {!Function} nativeFunc JavaScript function.
     * @param {boolean=} opt_constructor If true, the function's
     * prototype will have its constructor property set to the function.
     * If false, the function cannot be called as a constructor (e.g. escape).
     * Defaults to undefined.
     * @return {!Interpreter.MyObject} New function.
     */
    createNativeFunction(nativeFunc: Interpreter.NativeFunction, opt_constructor?: boolean): Interpreter.MyObject;
    /**
     * Create a new native asynchronous function.
     * @param {!Function} asyncFunc JavaScript function.
     * @return {!Interpreter.MyObject} New function.
     */
    createAsyncFunction(asyncFunc: any): Interpreter.MyObject;
    /**
     * Converts from a native JS object or value to a JS interpreter object.
     * Can handle JSON-style values.
     * @param {*} nativeObj The native JS object to be converted.
     * @return {Interpreter.MyValue} The equivalent JS interpreter object.
     */
    nativeToPseudo(nativeObj: any): Interpreter.MyValue;
    /**
     * Converts from a JS interpreter object to native JS object.
     * Can handle JSON-style values, plus cycles.
     * @param {Interpreter.MyValue} pseudoObj The JS interpreter object to be
     * converted.
     * @param {Object=} opt_cycles Cycle detection (used in recursive calls).
     * @return {*} The equivalent native JS object or value.
     */
    pseudoToNative(pseudoObj: Interpreter.MyValue, opt_cycles?: Interpreter.MyValueTable): any;
    /**
     * Look up the prototype for this value.
     * @param {Interpreter.MyValue} value Data object.
     * @return {Interpreter.MyObject} Prototype object, null if none.
     */
    getPrototype(value: Interpreter.MyValue): Interpreter.MyObject;
    /**
     * Fetch a property value from a data object.
     * @param {Interpreter.MyValue} obj Data object.
     * @param {Interpreter.MyValue} name Name of property.
     * @return {Interpreter.MyValue} Property value (may be undefined).
     */
    getProperty(obj: Interpreter.MyValue, name: Interpreter.MyValue): Interpreter.MyValue;
    /**
     * Does the named property exist on a data object.
     * @param {Interpreter.MyValue} obj Data object.
     * @param {Interpreter.MyValue} name Name of property.
     * @return {boolean} True if property exists.
     */
    hasProperty(obj: Interpreter.MyValue, name: Interpreter.MyValue): boolean;
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
    setProperty(obj: Interpreter.MyObject, name: Interpreter.MyValue, value: Interpreter.MyValue | ReferenceErrorConstructor, opt_descriptor?: any): Interpreter.MyObject;
    /**
     * Convenience method for adding a native function as a non-enumerable property
     * onto an object's prototype.
     * @param {!Interpreter.MyObject} obj Data object.
     * @param {Interpreter.MyValue} name Name of property.
     * @param {!Function} wrapper Function object.
     */
    private setNativeFunctionPrototype(obj, name, wrapper);
    /**
     * Returns the current scope from the stateStack.
     * @return {!Interpreter.MyObject} Current scope dictionary.
     */
    getScope(): Interpreter.MyObject;
    /**
     * Create a new scope dictionary.
     * @param {!Object} node AST node defining the scope container
     *     (e.g. a function).
     * @param {Interpreter.MyObject} parentScope Scope to link to.
     * @return {!Interpreter.MyObject} New scope.
     */
    createScope(node: ESTree.Node, parentScope: Interpreter.MyObject): Interpreter.MyObject;
    /**
     * Create a new special scope dictionary. Similar to createScope(), but
     * doesn't assume that the scope is for a function body.
     * This is used for 'catch' clauses and 'with' statements.
     * @param {!Interpreter.MyObject} parentScope Scope to link to.
     * @param {Interpreter.MyObject=} opt_scope Optional object to transform into
     *     scope.
     * @return {!Interpreter.MyObject} New scope.
     */
    createSpecialScope(parentScope: Interpreter.MyObject, opt_scope?: Interpreter.MyObject): Interpreter.MyObject;
    /**
     * Retrieves a value from the scope chain.
     * @param {string} name Name of variable.
     * @return {Interpreter.MyValue} Any value.
     *   May be flagged as being a getter and thus needing immediate execution
     *   (rather than being the value of the property).
     */
    getValueFromScope(name: string): Interpreter.MyValue;
    /**
     * Sets a value to the current scope.
     * @param {string} name Name of variable.
     * @param {Interpreter.MyValue} value Value.
     * @return {!Interpreter.MyObject|undefined} Returns a setter function if one
     *     needs to be called, otherwise undefined.
     */
    setValueToScope(name: string, value: Interpreter.MyValue): Interpreter.MyObject;
    /**
     * Create a new scope for the given node.
     * @param {!Object} node AST node (program or function).
     * @param {!Interpreter.MyObject} scope Scope dictionary to populate.
     * @private
     */
    populateScope_(node: ESTree.Node, scope: Interpreter.MyObject): void;
    /**
     * Remove start and end values from AST, or set start and end values to a
     * constant value.  Used to remove highlighting from polyfills and to set
     * highlighting in an eval to cover the entire eval expression.
     * @param {!Object} node AST node.
     * @param {number=} start Starting character of all nodes, or undefined.
     * @param {number=} end Ending character of all nodes, or undefined.
     * @private
     */
    private stripLocations_(node, start, end);
    /**
     * Is the current state directly being called with as a construction with 'new'.
     * @return {boolean} True if 'new foo()', false if 'foo()'.
     */
    calledWithNew(): boolean;
    /**
     * Gets a value from the scope chain or from an object property.
     * @param {!Array} ref Name of variable or object/propname tuple.
     * @return {Interpreter.MyValue} Any value.
     *   May be flagged as being a getter and thus needing immediate execution
     *   (rather than being the value of the property).
     */
    getValue(ref: any): Interpreter.MyValue;
    /**
     * Sets a value to the scope chain or to an object property.
     * @param {!Array} ref Name of variable or object/propname tuple.
     * @param {Interpreter.MyValue} value Value.
     * @return {!Interpreter.MyObject|undefined} Returns a setter function if one
     *     needs to be called, otherwise undefined.
     */
    setValue(ref: Array<any> & {
        0: Interpreter.MyObject;
        1: string;
    }, value: Interpreter.MyValue): Interpreter.MyObject;
    /**
     * Throw an exception in the interpreter that can be handled by an
     * interpreter try/catch statement.  If unhandled, a real exception will
     * be thrown.  Can be called with either an error class and a message, or
     * with an actual object to be thrown.
     * @param {!Interpreter.MyObject} errorClass Type of error (if message is
     *   provided) or the value to throw (if no message).
     * @param {string=} opt_message Message being thrown.
     */
    throwException(errorClass: Interpreter.MyObject, opt_message?: string): void;
    /**
     * Throw an exception in the interpreter that can be handled by a
     * interpreter try/catch statement.  If unhandled, a real exception will
     * be thrown.
     * @param {!Interpreter.MyObject} error Error object to execute.
     */
    executeException(error: Interpreter.MyObject): void;
    /**
     * Create a call to a getter function.
     * @param {!Interpreter.MyObject} func Function to execute.
     * @param {!Interpreter.MyObject|!Array} left
     *     Name of variable or object/propname tuple.
     * @private
     */
    createGetter_(func: Interpreter.MyObject, left: Interpreter.MyObject | Array<Interpreter.MyObject>): Interpreter.MyState;
    /**
     * Create a call to a setter function.
     * @param {!Interpreter.MyObject} func Function to execute.
     * @param {!Interpreter.MyObject|!Array} left
     *     Name of variable or object/propname tuple.
     * @param {Interpreter.MyValue} value Value to set.
     * @private
     */
    createSetter_(func: Interpreter.MyObject, left: Interpreter.MyObject | Array<Interpreter.MyObject>, value: Interpreter.MyValue): Interpreter.MyState;
    private stepArrayExpression(stack, state, node);
    private stepAssignmentExpression(stack, state, node);
    private stepBinaryExpression(stack, state, node);
    private stepBlockStatement(stack, state, node);
    private stepBreakStatement(stack, state, node);
    private stepCallExpression(stack, state, node);
    private stepCatchClause(stack, state, node);
    private stepConditionalExpression(stack, state, node);
    private stepContinueStatement(stack, state, node);
    private stepDebuggerStatement(stack, state, node);
    private stepDoWhileStatement(stack, state, node);
    private stepEmptyStatement(stack, state, node);
    private stepEvalProgram_(stack, state, node);
    private stepExpressionStatement(stack, state, node);
    private stepForInStatement(stack, state, node);
    private stepForStatement(stack, state, node);
    private stepFunctionDeclaration(stack, state, node);
    private stepFunctionExpression(stack, state, node);
    private stepIdentifier(stack, state, node);
    private stepIfStatement(stack, state, node);
    private stepLabeledStatement(stack, state, node);
    private stepLiteral(stack, state, node);
    private stepLogicalExpression(stack, state, node);
    private stepMemberExpression(stack, state, node);
    private stepNewExpression(stack, state, node);
    private stepObjectExpression(stack, state, node);
    private stepProgram(stack, state, node);
    private stepReturnStatement(stack, state, node);
    private stepSequenceExpression(stack, state, node);
    private stepSwitchStatement(stack, state, node);
    private stepThisExpression(stack, state, node);
    private stepThrowStatement(stack, state, node);
    private stepTryStatement(stack, state, node);
    private stepUnaryExpression(stack, state, node);
    private stepUpdateExpression(stack, state, node);
    private stepVariableDeclaration(stack, state, node);
    private stepWithStatement(stack, state, node);
    private stepWhileStatement(stack, state, node);
}
declare module Interpreter {
    /**
     * Class for an object.
     * @param {Interpreter.MyObject} proto Prototype object or null.
     * @constructor
     */
    class MyObject {
        [key: string]: any;
        getter: any;
        setter: any;
        properties: any;
        constructor(proto: any);
        /** @type {Interpreter.MyObject} */
        proto: Interpreter.MyObject;
        /** @type {boolean} */
        isObject: boolean;
        /** @type {string} */
        class: string;
        /** @type {Date|RegExp|boolean|number|string|undefined|null} */
        data: Date | RegExp | boolean | number | string | undefined | null;
        /**
         * Convert this object into a string.
         * @return {string} String value.
         * @override
         */
        toString(): string;
        /**
         * Return the object's value.
         * @return {Interpreter.MyValue} Value.
         * @override
         */
        valueOf(): string | number | boolean | this;
    }
    /**
     * Typedef for JS values.
     * @typedef {!Interpreter.MyObject|boolean|number|string|undefined|null}
     */
    type MyValue = MyObject | boolean | number | string | undefined | null;
    /**
     * Class for a state.
     * @param {!MyObject} node AST node for the state.
     * @param {!Interpreter.MyObject} scope Scope object for the state.
     * @constructor
     */
    class MyState {
        [key: string]: any;
        node: ESTree.BaseNode;
        scope: Interpreter.MyObject;
        constructor(node: ESTree.BaseNode, scope: Interpreter.MyObject);
    }
    interface MyValueTable {
        pseudo: MyValue[];
        native: any[];
    }
    interface Acorn {
        parse(code: string, options?: any): ESTree.Program;
    }
    interface NodeConstructor {
        new (): ESTree.BaseNode;
    }
    interface NativeFunction extends Function {
        id?: number;
    }
}
export = Interpreter;
