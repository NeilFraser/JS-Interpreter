"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var acorn = require("acorn");
var Interpreter = require("../../");
Interpreter.acorn = acorn;
// Test the interpreter.
var interpreter = new Interpreter("var a = 1, b = 2; a + b;");
interpreter.run();
console.log('1 + 2 = ' + interpreter.value); // shows '1 + 2 = 3' in the console
