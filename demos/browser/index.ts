
import acorn = require('acorn');
import Interpreter = require('../../dist/interpreter');
Interpreter.acorn = acorn;

// Test the interpreter.
var interpreter = new Interpreter("var a = 1, b = 2; a + b;");
interpreter.run();
alert('1 + 2 = ' + interpreter.value); // shows an alert '1 + 2 = 3'
