
import acorn = require('acorn');
import Interpreter = require('JS-Interpreter');
Interpreter.acorn = acorn;

// Test the interpreter.
var interpreter = new Interpreter("var a = 1, b = 2; a + b;");
interpreter.run();
console.log('1 + 2 = ' + interpreter.value); // shows '1 + 2 = 3' in the console
