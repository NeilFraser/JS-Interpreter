JS-Interpreter
==============

adds exports to use [NeilFraser/JS-Interpreter](https://github.com/NeilFraser/JS-Interpreter) with npm.

## Usage
To add this repo as a dependency, add the following line to the dependencies of your `package.json`
```json
"dependencies": {
    "js-interpreter": "https://github.com/derwehr/js-interpreter.git",
  },
```
Then import js-interpreter either using `import` or `require`
```JavaScript
import Interpreter from 'js-interpreter';
```
or
```JavaScript
const Interpreter = require('js-interpreter');
```
