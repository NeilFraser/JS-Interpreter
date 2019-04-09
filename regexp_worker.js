/**
 * @license
 * JavaScript Interpreter's Web Worker for Regular Expressions
 *
 * Copyright 2019 Google Inc.
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
 * @fileoverview Runs regular expressions in separate thread.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

onmessage = function(e) {
  var result;
  var data = e.data;
  switch (data[0]) {
    case 'split':
      // ['split', string, separator, limit]
      result = data[1].split(data[2], data[3]);
      break;
    case 'match':
      // ['match', string, regexp]
      result = data[1].match(data[2]);
      break;
    case 'search':
      // ['search', string, regexp]
      result = data[1].search(data[2]);
      break;
    case 'replace':
      // ['replace', string, regexp, newSubstr]
      result = data[1].replace(data[2], data[3]);
      break;
    case 'exec':
      // ['exec', regexp, lastIndex, string]
      var regexp = data[1];
      regexp.lastIndex = data[2];
      result = [regexp.exec(data[3]), data[1].lastIndex];
      break;
    default:
      throw 'Unknown RegExp operation: ' + data[0];
  }
  postMessage(result);
};
