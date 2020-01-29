import { Interpreter } from '../original-repo/interpreter.js';
import fs from 'fs';
import readline from 'readline';
import minimist from 'minimist';

const args = minimist(process.argv.slice(2));

const lineReader = readline.createInterface({
    input: args._.length ?
    fs.createReadStream(args._[0]) :
    process.stdin,
});

let code = '';

lineReader.on('line', line => (code += `${line}\n`));

const initFunc = (interpreter, scope) => {
    interpreter.setProperty(scope, 'console',
        interpreter.nativeToPseudo({
            log(...args) { console.log(...args) },
        }));
};

lineReader.on('close', () => new Interpreter(code, initFunc).run());
