JS Interpreter
==============

An npm package for the [Neil Fraser's JS-Interpreter](https://github.com/NeilFraser/JS-Interpreter)

This repository is not a fork of the original repository anymore, instead it
clones it as a `gitmodule` and packs it using `webpack` to an npm package.

Additional to the original library, this package contains a cli version which
can be used for testing the interpreter from terminal.

Changes are recorded on a best effort basis in [CHANGELOG.md](CHANGELOG.md).

# Installation

`npm install js-interpreter`

# Usage

## Using require

```
var Interpreter = require('js-interpreter');
var myInterpreter = new Interpreter('2 * 2');
```

## Using ES6 import

```
import Interpreter from 'js-interpreter';
const myInterpreter = new Interpreter('2 * 2');
```

## Using command line interface

```
js-interpreter path/to/my/file.js
```

or

```
echo 'console.log(1 + 2)' | js-interpreter 
```
