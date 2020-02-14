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

function deserialize(json, interpreter) {
  function decodeValue(value) {
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
  var stack = interpreter.stateStack;
  if (!Array.isArray(json)) {
    throw TypeError('Top-level JSON is not a list.');
  }
  if (!stack.length) {
    // Require native functions to be present.
    throw Error('Interpreter must be initialized prior to deserialization.');
  }
  // Find all native functions in existing interpreter.
  var objectList = [];
  objectHunt_(stack, objectList);
  var functionHash = Object.create(null);
  for (var i = 0; i < objectList.length; i++) {
    if (typeof objectList[i] == 'function') {
      functionHash[objectList[i].id] = objectList[i];
    }
  }
  // First pass: Create object stubs for every object.
  objectList = [];
  for (var i = 0; i < json.length; i++) {
    var jsonObj = json[i];
    var obj;
    switch (jsonObj['type']) {
      case 'Map':
        obj = Object.create(null);
        break;
      case 'Object':
        obj = {};
        break;
      case 'ScopeReference':
        obj = Interpreter.SCOPE_REFERENCE;
        break;
      case 'Function':
        obj = functionHash[jsonObj['id']];
        if (!obj) {
          throw RangeError('Function ID not found: ' + jsonObj['id']);
        }
        break;
      case 'Array':
        // Currently we assume that Arrays are not sparse.
        obj = [];
        break;
      case 'Date':
        obj = new Date(jsonObj['data']);
        if (isNaN(obj)) {
          throw TypeError('Invalid date: ' + jsonObj['data']);
        }
        break;
      case 'RegExp':
        obj = RegExp(jsonObj['source'], jsonObj['flags']);
        break;
      case 'PseudoObject':
        obj = new Interpreter.Object(null);
        break;
      case 'Scope':
        obj = new Interpreter.Scope(undefined, undefined, undefined);
        break;
      case 'State':
        obj = new Interpreter.State(undefined, undefined);
        break;
      case 'Node':
        obj = new interpreter.nodeConstructor();
        break;
      default:
        throw TypeError('Unknown type: ' + jsonObj['type']);
    }
    objectList[i] = obj;
  }
  // Second pass: Populate properties for every object.
  for (var i = 0; i < json.length; i++) {
    var jsonObj = json[i];
    var obj = objectList[i];
    // Repopulate objects.
    var props = jsonObj['props'];
    if (props) {
      var nonConfigurable = jsonObj['nonConfigurable'] || [];
      var nonEnumerable = jsonObj['nonEnumerable'] || [];
      var nonWritable = jsonObj['nonWritable'] || [];
      var names = Object.getOwnPropertyNames(props);
      for (var j = 0; j < names.length; j++) {
        var name = names[j];
        Object.defineProperty(obj, name,
            {configurable: nonConfigurable.indexOf(name) === -1,
             enumerable: nonEnumerable.indexOf(name) === -1,
             writable: nonWritable.indexOf(name) === -1,
             value: decodeValue(props[name])});
      }
    }
    // Repopulate arrays.
    if (Array.isArray(obj)) {
      var data = jsonObj['data'];
      if (data) {
        for (var j = 0; j < data.length; j++) {
          obj.push(decodeValue(data[j]));
        }
      }
    }
  }
  // First object is the interpreter.
  var root = objectList[0];
  for (var prop in root) {
    interpreter[prop] = root[prop];
  }
}

function serialize(interpreter) {
  function encodeValue(value) {
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

  // Find all objects.
  var objectList = [];
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
          jsonObj['data'] = obj.map(encodeValue);
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
      case interpreter.nodeConstructor.prototype:
        jsonObj['type'] = 'Node';
        break;
      default:
        throw TypeError('Unknown type: ' + obj);
    }
    var props = Object.create(null);
    var nonConfigurable = [];
    var nonEnumerable = [];
    var nonWritable = [];
    var names = Object.getOwnPropertyNames(obj);
    for (var j = 0; j < names.length; j++) {
      var name = names[j];
      props[name] = encodeValue(obj[name]);
      var descriptor = Object.getOwnPropertyDescriptor(obj, name);
      if (!descriptor.configurable) {
        nonConfigurable.push(name);
      }
      if (!descriptor.enumerable) {
        nonEnumerable.push(name);
      }
      if (!descriptor.writable) {
        nonWritable.push(name);
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
  }
  return json;
}

// Recursively search the stack to find all non-primitives.
function objectHunt_(node, objectList) {
  if (node && (typeof node === 'object' || typeof node === 'function')) {
    if (objectList.indexOf(node) != -1) {
      return;
    }
    objectList.push(node);
    if (typeof node === 'object') {  // Recurse.
      var names = Object.getOwnPropertyNames(node);
      for (var i = 0; i < names.length; i++) {
        objectHunt_(node[names[i]], objectList);
      }
    }
  }
}
