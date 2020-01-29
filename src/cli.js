import fs from 'fs';
import readline from 'readline';
import minimist from 'minimist';
import { Interpreter } from '../original-repo/interpreter';

const argv = minimist(process.argv.slice(2));

const lineReader = readline.createInterface({
  input: argv._.length
    ? fs.createReadStream(argv._[0])
    : process.stdin,
});

let code = '';

lineReader.on('line', (line) => {
  code += `${line}\n`;
});

const initFunc = (interpreter, scope) => {
  interpreter.setProperty(scope, 'console',
    interpreter.nativeToPseudo({
      log(...args) { console.log(...args); },
    }));
};

lineReader.on('close', () => new Interpreter(code, initFunc).run());
