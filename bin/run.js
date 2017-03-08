#!/usr/bin/env node

window = typeof window === 'undefined' ? global : window;
var fs = require('fs');
var Interpreter = require('../interpreter');

// add native console object to global interpreter scope
function initConsole(interpreter, scope) {
  var myConsole = interpreter.createObject(interpreter.OBJECT);
  interpreter.setProperty(
    scope,
    'console',
    myConsole
  );

  // add log function to console object
  function myLog() {
    for (var j = 0; j < arguments.length; j++) {
      arguments[j] = arguments[j].toString();
    }
    return interpreter.createPrimitive(console.log.apply(console, arguments));
  }
  interpreter.setProperty(
    myConsole,
    'log',
    interpreter.createNativeFunction(myLog),
    Interpreter.NONENUMERABLE_DESCRIPTOR
  );


  // add vm object
  var myVM = interpreter.createObject(interpreter.OBJECT);
  interpreter.setProperty(
    scope,
    'vm',
    myVM
  );

  function runInContext(source, context) {
    const interp = new Interpreter(source.toString(), function(interpreter, scope) {
      initConsole(interpreter, scope);
      for (var key in context.properties) {
        interpreter.setProperty(scope, key, context.properties[key]);
      }
    });
    interp.run();
  }

  interpreter.setProperty(
    myVM,
    'runInContext',
    interpreter.createNativeFunction(runInContext),
    Interpreter.NONENUMERABLE_DESCRIPTOR
  );

}

var code = fs.readFileSync(process.argv[process.argv.length - 1], 'utf-8');
new Interpreter(code, initConsole).run();
