define(["require", "exports", "acorn", "../../dist/interpreter"], function (require, exports, acorn, Interpreter) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Interpreter.acorn = acorn;
    // Test the interpreter.
    var interpreter = new Interpreter("var a = 1, b = 2; a + b;");
    interpreter.run();
    alert('1 + 2 = ' + interpreter.value); // shows an alert '1 + 2 = 3'
});
