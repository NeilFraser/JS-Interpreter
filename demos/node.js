// Minimal test of JS-Interpreter in Node.
global.acorn = require('../acorn');
const JSInterpreter = require('../interpreter');

const myCode = `
var result = [];
function fibonacci(n, output) {
  var a = 1, b = 1, sum;
  for (var i = 0; i < n; i++) {
    output.push(a);
    sum = a + b;
    a = b;
    b = sum;
  }
}
fibonacci(16, result);
alert(result.join(', '));
`;

// Set up 'alert' as an interface to Node's console.log.
const initFunc = function(interpreter, globalObject) {
  const wrapper = function(text) {
    console.log(text);
  };
  interpreter.setProperty(globalObject, 'alert',
      interpreter.createNativeFunction(wrapper));
};

const myInterpreter = new JSInterpreter.Interpreter(myCode, initFunc);

const runToCompletion = function() {
  if (myInterpreter.run()) {
    // Ran until an async call.  Give this call a chance to run.
    // Then start running again later.
    setTimeout(runToCompletion, 10);
  }
};
runToCompletion();
