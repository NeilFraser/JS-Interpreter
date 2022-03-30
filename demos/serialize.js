/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Saving and restoring the state of a JS-Intepreter.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';


// Constructors for objects within Acorn.
var NODE_CONSTRUCTOR;
var NODE_LOC_CONSTRUCTOR;
var LINE_LOC_CONSTRUCTOR;

var LOC_REGEX = /^(\d*):(\d*)-(\d*):(\d*) ?(.*)$/;

/**
 * All non-primitives in the interpreter.
 * @type {!Array<!Object>}
 */
 var objectList = [];

/**
 * Inspect an interpreter and record the constructors used to create new nodes.
 * @param {!Interpreter} interpreter JS-Interpreter instance.
 * @private
 */
function recordAcornConstructons_(interpreter) {
  // Constructors for objects within Acorn.
  if (!interpreter.ast) {
    // The 'ast' property has been renamed by the compiler.
    throw Error('Cannot serialize/deserialize compressed JS-Interpreter. ' +
        'Use acorn.js and interpreter.js instead of acorn_interpreter.js')
  }
  NODE_CONSTRUCTOR = interpreter.ast.constructor;
  NODE_LOC_CONSTRUCTOR = interpreter.ast.loc &&
      interpreter.ast.loc.constructor;
  LINE_LOC_CONSTRUCTOR = interpreter.ast.loc &&
      interpreter.ast.loc.end.constructor;
}

/**
 * Populate an interpreter to the state defined by serialized JSON.
 * @param {string} json Serialized JSON.
 * @param {!Interpreter} interpreter JS-Interpreter instance to restore to.
 */
function deserialize(json, interpreter) {
  var stack = interpreter.getStateStack();
  if (!Array.isArray(json)) {
    throw TypeError('Top-level JSON is not a list.');
  }
  if (!stack.length) {
    // Require native functions to be present.
    throw Error('Interpreter must be initialized prior to deserialization.');
  }
  recordAcornConstructons_(interpreter);
  // Find all native functions in existing interpreter.
  objectList = [];
  objectHunt_(stack);
  var functionMap = Object.create(null);
  for (var i = 0; i < objectList.length; i++) {
    var obj = objectList[i];
    if (typeof obj === 'function') {
      functionMap[obj.id] = obj;
    }
  }
  // First pass: Create object stubs for every object.
  objectList = new Array(json.length);
  for (var i = 0; i < json.length; i++) {
    objectList[i] = createObjectStub_(json[i], functionMap);
  }
  // Second pass: Populate properties for every object.
  for (var i = 0; i < json.length; i++) {
    populateObject_(json[i], objectList[i]);
  }
  // First object is the interpreter.
  var root = objectList[0];
  for (var prop in root) {
    interpreter[prop] = root[prop];
  }
  objectList = [];  // Garbage collect.
}

/**
 * Given the JSON description of an object, create the object.
 * But don't populate its properties yet.
 * @param {!Object} jsonObj JSON description of object.
 * @param {!Object} functionMap Map of ID to native functions.
 * @return {!Object} Stub of real object.
 * @private
 */
 function createObjectStub_(jsonObj, functionMap) {
  switch (jsonObj['type']) {
    case 'Map':
      return Object.create(null);
    case 'Object':
      return {};
    case 'ScopeReference':
      return Interpreter.SCOPE_REFERENCE;
    case 'Function':
      var obj = functionMap[jsonObj['id']];
      if (!obj) {
        throw RangeError('Function ID not found: ' + jsonObj['id']);
      }
      return obj;
    case 'Array':
      // Currently we assume that Arrays are not sparse.
      return [];
    case 'Date':
      var obj = new Date(jsonObj['data']);
      if (isNaN(obj)) {
        throw TypeError('Invalid date: ' + jsonObj['data']);
      }
      return obj;
    case 'RegExp':
      return RegExp(jsonObj['source'], jsonObj['flags']);
    case 'PseudoObject':
      return new Interpreter.Object(null);
    case 'Scope':
      return new Interpreter.Scope(undefined, undefined, undefined);
    case 'State':
      return new Interpreter.State(undefined, undefined);
    case 'Node':
      var obj = new NODE_CONSTRUCTOR();
      delete obj.start;
      delete obj.end;
      var locText = jsonObj['loc'];
      if (locText) {
        var loc = new NODE_LOC_CONSTRUCTOR();
        var m = locText.match(LOC_REGEX);
        var locStart = null;
        if (m[1] || m[2]) {
          locStart = new LINE_LOC_CONSTRUCTOR();
          locStart.line = Number(m[1]);
          locStart.column = Number(m[2]);
        }
        loc.start = locStart;
        var locEnd = null;
        if (m[3] || m[4]) {
          locEnd = new LINE_LOC_CONSTRUCTOR();
          locEnd.line = Number(m[3]);
          locEnd.column = Number(m[4]);
        }
        loc.end = locEnd;
        if (m[5]) {
          loc.source = decodeURI(m[5]);
        } else {
          delete loc.source;
        }
        obj.loc = loc;
      }
      return obj;
  }
  throw TypeError('Unknown type: ' + jsonObj['type']);
}

/**
 * Repopulate an object's or array's properties based on th JSON description.
 * @param {!Object} jsonObj JSON object describing property contents.
 * @param {!Object} obj Object to set properties on.
 * @private
 */
function populateObject_(jsonObj, obj) {
  // Repopulate objects.
  var props = jsonObj['props'];
  if (props) {
    var nonConfigurable = jsonObj['nonConfigurable'] || [];
    var nonEnumerable = jsonObj['nonEnumerable'] || [];
    var nonWritable = jsonObj['nonWritable'] || [];
    var getter = jsonObj['getter'] || [];
    var setter = jsonObj['setter'] || [];
    var names = Object.getOwnPropertyNames(props);
    for (var j = 0; j < names.length; j++) {
      var name = names[j];
      var descriptor = {
        configurable: nonConfigurable.indexOf(name) === -1,
        enumerable: nonEnumerable.indexOf(name) === -1
      };
      var hasGetter = getter.indexOf(name) !== -1;
      var hasSetter = setter.indexOf(name) !== -1;
      if (hasGetter || hasSetter) {
        if (hasGetter) {
          descriptor.get = interpreter.setProperty.placeholderGet_;
        }
        if (hasSetter) {
          descriptor.set = interpreter.setProperty.placeholderSet_;
        }
      } else {
        descriptor.value = decodeValue_(props[name]);
        descriptor.writable = nonWritable.indexOf(name) === -1;
      }
      Object.defineProperty(obj, name, descriptor);
    }
  }
  // Repopulate arrays.
  if (Array.isArray(obj)) {
    var data = jsonObj['data'];
    if (data) {
      for (var j = 0; j < data.length; j++) {
        obj.push(decodeValue_(data[j]));
      }
    }
  }
}

/**
 * Given a serialized value, decode it to a real value.
 * Most values are themselves.  But objects are references, and Infinity, NaN,
 * -0 and undefined are specially encoded.
 * @param {*} value Serialized value.
 * @return {*} Real value.
 * @private
 */
 function decodeValue_(value) {
  if (value && typeof value === 'object') {
    var data;
    if ((data = value['#'])) {
      // Object reference: {'#': 42}
      value = objectList[data];
      if (!value) {
        throw ReferenceError('Object reference not found: ' + data);
      }
      return value;
    }
    if ((data = value['Number'])) {
      // Special number: {'Number': 'Infinity'}
      return Number(data);
    }
    if ((data = value['Value'])) {
      // Special value: {'Value': 'undefined'}
      if (value['Value'] === 'undefined') {
        return undefined;
      }
    }
  }
  return value;
}

/**
 * Generate JSON that completely describes an interpreter's state.
 * @param {!Interpreter} interpreter JS-Interpreter instance to serialize.
 * @return {string} Serialized JSON.
 */
function serialize(interpreter) {
  // Shallow-copy all properties of interest onto a root object.
  var properties = [
    'OBJECT', 'OBJECT_PROTO',
    'FUNCTION', 'FUNCTION_PROTO',
    'ARRAY', 'ARRAY_PROTO',
    'REGEXP', 'REGEXP_PROTO',
    'BOOLEAN',
    'DATE',
    'NUMBER',
    'STRING',
    'ERROR',
    'EVAL_ERROR',
    'RANGE_ERROR',
    'REFERENCE_ERROR',
    'SYNTAX_ERROR',
    'TYPE_ERROR',
    'URI_ERROR',
    'globalScope',
    'globalObject',
    'stateStack'
  ];
  var root = Object.create(null);
  for (var i = 0; i < properties.length; i++) {
    root[properties[i]] = interpreter[properties[i]];
  }

  recordAcornConstructons_(interpreter);
  // Find all objects.
  objectList = [];
  objectHunt_(root, objectList);
  // Serialize every object.
  var json = [];
  for (var i = 0; i < objectList.length; i++) {
    var jsonObj = Object.create(null);
    json.push(jsonObj);
    var obj = objectList[i];
    // Uncomment this line for a debugging label.
    //jsonObj['#'] = i;
    switch (Object.getPrototypeOf(obj)) {
      case null:
        jsonObj['type'] = 'Map';
        break;
      case Object.prototype:
        if (obj === Interpreter.SCOPE_REFERENCE) {
          jsonObj['type'] = 'ScopeReference';
          continue;  // No need to index properties.
        } else {
          jsonObj['type'] = 'Object';
        }
        break;
      case Function.prototype:
        jsonObj['type'] = 'Function';
        jsonObj['id'] = obj.id;
        if (obj.id === undefined) {
          throw Error('Native function has no ID: ' + obj);
        }
        continue;  // No need to index properties.
      case Array.prototype:
        // Currently we assume that Arrays are not sparse.
        jsonObj['type'] = 'Array';
        if (obj.length) {
          jsonObj['data'] = obj.map(encodeValue_);
        }
        continue;  // No need to index properties.
      case Date.prototype:
        jsonObj['type'] = 'Date';
        jsonObj['data'] = obj.toJSON();
        continue;  // No need to index properties.
      case RegExp.prototype:
        jsonObj['type'] = 'RegExp';
        jsonObj['source'] = obj.source;
        jsonObj['flags'] = obj.flags;
        continue;  // No need to index properties.
      case Interpreter.Object.prototype:
        jsonObj['type'] = 'PseudoObject';
        break;
      case Interpreter.Scope.prototype:
        jsonObj['type'] = 'Scope';
        break;
      case Interpreter.State.prototype:
        jsonObj['type'] = 'State';
        break;
      case NODE_CONSTRUCTOR.prototype:
        jsonObj['type'] = 'Node';
        break;
      default:
        throw TypeError('Unknown type: ' + obj);
    }
    var props = Object.create(null);
    var nonConfigurable = [];
    var nonEnumerable = [];
    var nonWritable = [];
    var getter = [];
    var setter = [];
    var names = Object.getOwnPropertyNames(obj);
    for (var j = 0; j < names.length; j++) {
      var name = names[j];
      if (jsonObj['type'] === 'Node' && name === 'loc') {
        // Compactly serialize the location objects on a Node.
        var loc = obj.loc;
        var locText = '';
        if (loc.start) {
          locText += loc.start.line + ':' + loc.start.column;
        } else {
          locText += ':';
        }
        locText += '-';
        if (loc.end) {
          locText += loc.end.line + ':' + loc.end.column;
        } else {
          locText += ':';
        }
        if (loc.source !== undefined) {
          locText += ' ' + encodeURI(loc.source);
        }
        jsonObj['loc'] = locText;
      } else {
        var descriptor = Object.getOwnPropertyDescriptor(obj, name);
        props[name] = encodeValue_(descriptor.value);
        if (!descriptor.configurable) {
          nonConfigurable.push(name);
        }
        if (!descriptor.enumerable) {
          nonEnumerable.push(name);
        }
        if (!descriptor.writable) {
          nonWritable.push(name);
        }
        if (descriptor.get) {
          getter.push(name);
        }
        if (descriptor.set) {
          setter.push(name);
        }
      }
    }
    if (names.length) {
      jsonObj['props'] = props;
    }
    if (nonConfigurable.length) {
      jsonObj['nonConfigurable'] = nonConfigurable;
    }
    if (nonEnumerable.length) {
      jsonObj['nonEnumerable'] = nonEnumerable;
    }
    if (nonWritable.length) {
      jsonObj['nonWritable'] = nonWritable;
    }
    if (getter.length) {
      jsonObj['getter'] = getter;
    }
    if (setter.length) {
      jsonObj['setter'] = setter;
    }
  }
  objectList = [];  // Garbage collect.
  return json;
}

/**
 * Given a real value, encode it to a serialized value.
 * Most values are themselves.  But objects are references, and Infinity, NaN,
 * -0 and undefined are specially encoded.
 * @param {*} value Real value.
 * @return {*} Serialized value.
 */
 function encodeValue_(value) {
  if (value && (typeof value === 'object' || typeof value === 'function')) {
    var ref = objectList.indexOf(value);
    if (ref === -1) {
      throw RangeError('Object not found in table.');
    }
    return {'#': ref};
  }
  if (value === undefined) {
    return {'Value': 'undefined'};
  }
  if (typeof value === 'number') {
    if (value === Infinity) {
      return {'Number': 'Infinity'};
    } else if (value === -Infinity) {
      return {'Number': '-Infinity'};
    } else if (isNaN(value)) {
      return {'Number': 'NaN'};
    } else if (1 / value === -Infinity) {
      return {'Number': '-0'};
    }
  }
  return value;
}

/**
 * Recursively search the stack to find all non-primitives.
 * Stores the results in the objectList global variable.
 * @param {!Object} node Root node to start searching.
 */
function objectHunt_(node) {
  if (node && (typeof node === 'object' || typeof node === 'function')) {
    if (objectList.indexOf(node) !== -1) {
      return;
    }
    objectList.push(node);
    if (typeof node === 'object') {  // Recurse.
      var isAcornNode =
          Object.getPrototypeOf(node) === NODE_CONSTRUCTOR.prototype;
      var names = Object.getOwnPropertyNames(node);
      for (var i = 0; i < names.length; i++) {
        var name = names[i];
        if (isAcornNode && name === 'loc') {
          continue;  // Skip over node locations, they are specially handled.
        }
        try {
          var nextNode = node[name];
        } catch (e) {
          // Accessing some properties may trigger a placeholder getter.
          // Squelch this error, but re-throw any others.
          if (e.message !== 'Placeholder getter') {
            throw e;
          }
          continue;
        }
        objectHunt_(nextNode);
      }
    }
  }
}
