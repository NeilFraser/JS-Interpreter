#!/usr/bin/env node
/**
 * This script is a command line runner for JS-Interpreter.
 * It exposes a few "native" apis that can be used in the
 * script being interpreted:
 *
 * 1. console.log(...args: string[]) - just a pass through to
 *        node's native console.log implementation
 *
 * 2. vm.runInContext(source: string, context: Object) - executes
 *        the interpreter against the given source, using the context
 *        object for the global scope.
 *
 * Usage:
 *   js-interpreter <filepath.js>
 */

window = typeof window === 'undefined' ? global : window;
const fs = require('fs');
const yargs = require('yargs');

const Interpreter = require('../interpreter');

const argv = yargs
  .usage(`Usage: $0 <filepath.js>`)
  .help('h')
  .alias('h', 'help')
  .demandCommand(1)
  .argv;


function createConsoleObject(interpreter) {
  const myConsole = interpreter.createObject(interpreter.OBJECT);
  // add log function to console object
  function myLog() {
    for (let j = 0; j < arguments.length; j++) {
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
  return myConsole;
}

function createVMObject(interpreter) {
  const vm = interpreter.createObject(interpreter.OBJECT);
  function runInContext(source, context) {
    const interp = new Interpreter(source.toString(), function(interpreter, scope) {
      initInterpreterScope(interpreter, scope);
      for (let key in context.properties) {
        interpreter.setProperty(scope, key, context.properties[key]);
      }
    });
    interp.run();
  }

  interpreter.setProperty(
    vm,
    'runInContext',
    interpreter.createNativeFunction(runInContext),
    Interpreter.NONENUMERABLE_DESCRIPTOR
  );
  return vm;
}

// adds "native" global properties to the interpreter's scope
function initInterpreterScope(interpreter, scope) {

  // add native console object to global interpreter scope
  interpreter.setProperty(
    scope,
    'console',
    createConsoleObject(interpreter)
  );

  // add vm object
  interpreter.setProperty(
    scope,
    'vm',
    createVMObject(interpreter)
  );

}

const code = fs.readFileSync(argv._[0], 'utf-8');
new Interpreter(code, initInterpreterScope).run();
