
// Require Interpreter and set acorn parser.
requirejs(['../../lib/interpreter', '../../lib/acorn']
  , function (Interpreter, acorn) {
  Interpreter.acorn = acorn;

  // Test the interpreter.
  var interpreter = new Interpreter("var a = 1, b = 2; a + b;");
  interpreter.run();
  alert('1 + 2 = ' + interpreter.value); // shows an alert '1 + 2 = 3'
});
