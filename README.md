JS-Interpreter
==============

A sandboxed JavaScript interpreter written in TypeScript, packed with `Webpack` or `tsc` for use with Node.js or within a browser (either loaded [statically](https://junkato.jp/JS-Interpreter/) or [dynamically](https://junkato.jp/JS-Interpreter/?required)). Execute arbitrary JavaScript code line by line in isolation and safety.

This interpreter is a TypeScript port of [the original JavaScript version](https://github.com/NeilFraser/JS-Interpreter).

There are several library files that serve different use cases. See below for more concrete instructions.

- `dist/interpreter.js` ... packed with `tsc` and can be loaded from Node.js or a browser with RequireJS. `acorn` needs to be loaded separately.
- `dist/interpreter.d.ts` ... TypeScript type definition
- `dist/acorn_interpreter.js` ... packed with `Webpack` as a library and  can be loaded with a `<script>` tag from a browser. `acorn` is bundled.
- `dist/interpreter.global.js` ... packed with `Webpack` as a library and can be loaded with a `<script>` tag from a browser. `acorn` needs to be loaded separately.

Live demo:
[https://junkato.jp/JS-Interpreter](https://junkato.jp/JS-Interpreter)

More demos:
[https://junkato.jp/JS-Interpreter/demos](https://junkato.jp/JS-Interpreter/demos)

Documentation:
This `README` file ... or the original documentation at 
[https://neil.fraser.name/software/JS-Interpreter/docs.html](https://neil.fraser.name/software/JS-Interpreter/docs.html)



## Node.js Basic Usage

`npm install` to install the latest code.

```sh
npm install acorn https://github.com/arcatdmz/JS-Interpreter --save
npm install @types/acorn --save-dev
```

Write typed code with perfect auto completion!

```typescript
import acorn = require('acorn');
import Interpreter = require('JS-Interpreter');
Interpreter.acorn = acorn;

// Test the interpreter.
var interpreter = new Interpreter("var a = 1, b = 2; a + b;");
interpreter.run();
console.log('1 + 2 = ' + interpreter.value);
// shows '1 + 2 = 3' in the console
```

## Browser Basic Usage

Load `dist/acorn_interpreter.js` statically and use the globally-declared `Interpreter` class.

```html
<script src="https://cdn.rawgit.com/arcatdmz/JS-Interpreter/39cbd828/dist/acorn_interpreter.js"></script>
<script>
var interpreter = new Interpreter("var a = 1, b = 2; a + b;");
interpreter.run();
alert('1 + 2 = ' + interpreter.value);
// shows an alert '1 + 2 = 3'
</script>
```

## Dynamic loading with RequireJS

Load `dist/acorn.js` and `dist/interpreter.js` dynamically with [RequireJS](//requirejs.org) and use the `Interpreter` class.
No global scope pollution!

```html
<script src="https://cdn.rawgit.com/arcatdmz/JS-Interpreter/39cbd828/lib/require.js"></script>
<script>
requirejs(['https://cdn.rawgit.com/arcatdmz/JS-Interpreter/39cbd828/lib/acorn.js', 'https://cdn.rawgit.com/arcatdmz/JS-Interpreter/39cbd828/dist/interpreter.amd.js'], function (acorn, Interpreter) {
  Interpreter.acorn = acorn; // Manually pass acorn runtime to the Interpreter
  var interpreter = new Interpreter("var a = 1, b = 2; a + b;");
  interpreter.run();
  alert('1 + 2 = ' + interpreter.value);
  // shows an alert '1 + 2 = 3'
});
</script>
```

--------------
(c) 2013-2017 Google Inc. and [Jun Kato](https://junkato.jp)
