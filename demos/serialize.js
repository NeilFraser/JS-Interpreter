/**
 * @license
 * JavaScript Interpreter: serialization and deserialization
 *
 * Copyright 2017 Google Inc.
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
 * @fileoverview Saving and restoring the state of a JS-Intepreter.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

function deserialize(json, interpreter) {
  function decodeValue(value) {
    if (value && typeof value == 'object') {
      var data;
      if ((data = value['#'])) {
       // Object reference: {'#': 42}
       value = objectList[data];
        if (!value) {
          throw 'Object reference not found: ' + data;
        }
        return value;
      }
      if ((data = value['Number'])) {
        // Special number: {'Number': 'Infinity'}
        return Number(data);
      }
      if ((data = value['Value'])) {
        // Special value: {'Value': 'undefined'}
        if (value['Value'] == 'undefined') {
          return undefined;
        }
      }
    }
    return value;
  }
  var stack = interpreter.stateStack;
  if (!Array.isArray(json)) {
    throw 'Top-level JSON is not a list.';
  }
  if (!stack.length) {
    // Require native functions to be present.
    throw 'Interpreter must be initialized prior to deserialization.';
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
  // Get a handle on Acorn's node_t object.
  var nodeProto = stack[0].node.constructor.prototype;
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
      case 'Function':
        obj = functionHash[jsonObj['id']];
        if (!obj) {
          throw 'Function ID not found: ' + jsonObj['id'];
        }
        break;
      case 'Array':
        // Currently we assume that Arrays are not sparse.
        obj = [];
        break;
      case 'Date':
        obj = new Date(jsonObj['data']);
        if (isNaN(obj)) {
          throw 'Invalid date: ' + jsonObj['data'];
        }
        break;
      case 'RegExp':
        obj = RegExp(jsonObj['source'], jsonObj['flags']);
        break;
      case 'PseudoObject':
        obj = new Interpreter.Object(null);
        break;
      case 'PseudoPrimitive':
        // decodeValue is needed here for -0, NaN, Infinity, -Infinity.
        // It is guaranteed not to have an object reference.
        obj = interpreter.createPrimitive(decodeValue(jsonObj['data']));
        break;
      case 'Node':
        obj = Object.create(nodeProto);
        break;
      default:
        throw 'Unknown type: ' + jsonObj['type'];
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
      var names = Object.getOwnPropertyNames(props);
      for (var j = 0; j < names.length; j++) {
        var name = names[j];
        obj[name] = decodeValue(props[name]);
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
  // First object is the stack.
  interpreter.stateStack = objectList[0];
}

function serialize(interpreter) {
  function encodeValue(value) {
    if (value && (typeof value == 'object' || typeof value == 'function')) {
      var ref = objectList.indexOf(value);
      if (ref == -1) {
        throw 'Object not found in table.';
      }
      return {'#': ref};
    }
    if (value === undefined) {
      return {'Value': 'undefined'};
    }
    if (typeof value == 'number') {
      if (value == Infinity) {
        return {'Number': 'Infinity'};
      } else if (value == -Infinity) {
        return {'Number': '-Infinity'};
      } else if (isNaN(value)) {
        return {'Number': 'NaN'};
      } else if (1 / value == -Infinity) {
        return {'Number': '-0'};
      }
    }
    return value;
  }
  var stack = interpreter.stateStack;
  // Find all objects.
  var objectList = [];
  objectHunt_(stack, objectList);
  // Get a handle on Acorn's node_t object.
  var nodeProto = stack[0].node.constructor.prototype;
  // Serialize every object.
  var json = [];
  for (var i = 0; i < objectList.length; i++) {
    var jsonObj = Object.create(null);
    json.push(jsonObj);
    var obj = objectList[i];
    switch (Object.getPrototypeOf(obj)) {
      case null:
        jsonObj['type'] = 'Map';
        break;
      case Object.prototype:
        jsonObj['type'] = 'Object';
        break;
      case Function.prototype:
        jsonObj['type'] = 'Function';
        jsonObj['id'] = obj.id;
        if (obj.id === undefined) {
          throw 'Native function has no ID: ' + obj;
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
      case Interpreter.Primitive.prototype:
        jsonObj['type'] = 'PseudoPrimitive';
        jsonObj['data'] = encodeValue(obj.data);
        continue;  // No need to index properties.
      case nodeProto:
        jsonObj['type'] = 'Node';
        break;
      default:
        throw 'Unknown type: ' + obj;
    }
    var props = Object.create(null);
    var names = Object.getOwnPropertyNames(obj);
    for (var j = 0; j < names.length; j++) {
      var name = names[j];
      props[name] = encodeValue(obj[name]);
    }
    if (names.length) {
      jsonObj['props'] = props;
    }
  }
  return json;
}

// Recursively search the stack to find all non-primitives.
function objectHunt_(node, objectList) {
  if (node && (typeof node == 'object' || typeof node == 'function')) {
    if (objectList.indexOf(node) != -1) {
      return;
    }
    objectList.push(node);
    if (typeof node == 'object') {  // Recurse.
      var names = Object.getOwnPropertyNames(node);
      for (var i = 0; i < names.length; i++) {
        objectHunt_(node[names[i]], objectList);
      }
    }
  }
}
