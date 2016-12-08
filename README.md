js-interpreter
==============

An npm package for the [JS-Interpreter](https://github.com/NeilFraser/JS-Interpreter)

# Installation

`npm install js-interpreter`

# Usage

## Using require

```
var Interpreter = require('js-interpreter').Interpreter;
var myInterpreter = new Interpreter('2 * 2');
```

## Using ES6 import

```
import { Interpreter } from 'js-interpreter';
const myInterpreter = new Interpreter('2 * 2');
```
