const JSInterpreter = require('./interpreter')
const fs = require('fs')
const readline = require('readline')
const minimist = require('minimist')

const args = minimist(process.argv.slice(2))

const lineReader = readline.createInterface({
  input: args._.length ?
    fs.createReadStream(args._[0]) :
    process.stdin,
})

let code = ''

lineReader.on('line', line => (code += `${line}\n`))

const initFunc = (interpreter, scope) => {
  interpreter.setProperty(scope, 'console',
    interpreter.nativeToPseudo({
      log(...args) { console.log(...args) }, // eslint-disable-line no-console
    }))
}

lineReader.on('close', () => new JSInterpreter(code, initFunc).run())
