#!/usr/bin/env node
const path = require('path');
const yargs = require('yargs');
const fs = require('fs');
const execSync = require('child_process').execSync;
const spawn = require('child_process').spawn;
const chalk = require('chalk');
const runner = require('./runner');


const TESTS_DIRECTORY = path.resolve(__dirname, 'test262');
const DEFAULT_TEST_RESULTS_FILE = 'test-results-new.json';
const DEFAULT_VERBOSE_TEST_RESULTS_FILE = 'test-results-new.verbose.json';
const SAVED_RESULTS_FILE = path.resolve(__dirname, 'test-results.json');

const argv = yargs
  .usage(`Usage: $0 [options] [${DEFAULT_TEST_RESULTS_FILE}]`)

  .alias('d', 'diff')
  .describe('d', 'diff against existing test results')

  .alias('r', 'run')
  .describe('r', 'generate new test results')

  .alias('s', '--save')
  .describe('s', 'save the results')

  .alias('t', 'threads')
  .describe('t', '# of threads to use')
  .nargs('t', 1)
  .default('t', 4)

  .alias('v', 'verbose')

  .alias('g', 'glob')
  .describe('g', 'glob of tests to run')
  .nargs('g', 1)

  .alias('o', 'out')
  .describe('o', 'Directory to dump compiled test files to')
  .nargs('o', 1)

  .help('h')
  .alias('h', 'help')
  .argv;

const RESULTS_FILE = argv._[0] || path.resolve(__dirname, DEFAULT_TEST_RESULTS_FILE);
const VERBOSE_RESULTS_FILE = path.resolve(__dirname, DEFAULT_VERBOSE_TEST_RESULTS_FILE);

function downloadTestsIfNecessary() {
  if (!fs.existsSync(TESTS_DIRECTORY)) {
    console.log("Downloading test262 test suite");
    execSync(`git clone https://github.com/tc39/test262.git --depth 1 ${TESTS_DIRECTORY}`);
  }
}

function saveResults(results) {
  console.log('Saving results for future comparison...');
  results = results.map(test => ({
    file: test.file,
    attrs: test.attrs,
    result: test.result,
  }))
  results.sort((a,b) => a.file < b.file ? -1 : a.file === b.file ? 0 : 1);
  fs.writeFileSync(SAVED_RESULTS_FILE, JSON.stringify(results, null, 2));
}

function runTests(outputFilePath, verboseOutputFilePath) {
  downloadTestsIfNecessary();
  console.log(`running tests with ${argv.threads/1} threads...`);

  return new Promise(resolve => {
    let count = 1;
    const outputFile = fs.openSync(outputFilePath, 'w');
    const verboseOutputFile = fs.openSync(verboseOutputFilePath, 'w');
    runner.run({
      compiledFilesDir: argv.out && path.resolve(argv.out),
      threads: argv.threads,
      hostType: 'js-interpreter',
      hostPath: './bin/run.js',
      test262Dir: 'tests/test262',
      reporter: (results) => {
        results.on('start', function () {
          fs.appendFileSync(outputFile, '[\n');
          fs.appendFileSync(verboseOutputFile, '[\n');
        });
        results.on('end', function () {
          fs.appendFileSync(outputFile, ']\n');
          fs.appendFileSync(verboseOutputFile, ']\n');
          fs.closeSync(outputFile);
          console.log(`finished running ${count} tests`);
          resolve();
        });

        results.on('test end', test => {
          const color = test.result.pass ? chalk.green : chalk.red;
          const description = (test.attrs.description || test.file).trim().replace('\n', ' ')
          console.log(`${count+1} ${test.file} ${color(description)}`);
          if (count > 1) {
            fs.appendFileSync(outputFile, ',\n')
            fs.appendFileSync(verboseOutputFile, ',\n');
          }
          fs.appendFileSync(
            outputFile,
            JSON.stringify({
              file: test.file,
              attrs: test.attrs,
              result: test.result,
            }, null, 2)+'\n'
          );
          fs.appendFileSync(verboseOutputFile, JSON.stringify(test, null, 2)+'\n');

          count++;
        });
      },
      globs: argv.glob ? [argv.glob] : [
        'tests/test262/test/language/**/*.js',
        'tests/test262/test/built-ins/Array/**/*.js',
        'tests/test262/test/built-ins/ArrayBuffer/**/*.js',
        'tests/test262/test/built-ins/ArrayIteratorPrototype/**/*.js',
        'tests/test262/test/built-ins/AsyncFunction/**/*.js',
        'tests/test262/test/built-ins/Atomics/**/*.js',
        'tests/test262/test/built-ins/Boolean/**/*.js',
        'tests/test262/test/built-ins/DataView/**/*.js',
        'tests/test262/test/built-ins/Date/**/*.js',
        'tests/test262/test/built-ins/decodeURI/**/*.js',
        'tests/test262/test/built-ins/decodeURIComponent/**/*.js',
        'tests/test262/test/built-ins/encodeURI/**/*.js',
        'tests/test262/test/built-ins/encodeURIComponent/**/*.js',
        'tests/test262/test/built-ins/Error/**/*.js',
        'tests/test262/test/built-ins/eval/**/*.js',
        'tests/test262/test/built-ins/Function/**/*.js',
        'tests/test262/test/built-ins/GeneratorFunction/**/*.js',
        'tests/test262/test/built-ins/GeneratorPrototype/**/*.js',
        'tests/test262/test/built-ins/global/**/*.js',
        'tests/test262/test/built-ins/Infinity/**/*.js',
        'tests/test262/test/built-ins/isFinite/**/*.js',
        'tests/test262/test/built-ins/isNaN/**/*.js',
        'tests/test262/test/built-ins/IteratorPrototype/**/*.js',
        'tests/test262/test/built-ins/JSON/**/*.js',
        'tests/test262/test/built-ins/Map/**/*.js',
        'tests/test262/test/built-ins/MapIteratorPrototype/**/*.js',
        'tests/test262/test/built-ins/Math/**/*.js',
        'tests/test262/test/built-ins/NaN/**/*.js',
        'tests/test262/test/built-ins/NativeErrors/**/*.js',
        'tests/test262/test/built-ins/Number/**/*.js',
        'tests/test262/test/built-ins/Object/**/*.js',
        'tests/test262/test/built-ins/parseFloat/**/*.js',
        'tests/test262/test/built-ins/parseInt/**/*.js',
        'tests/test262/test/built-ins/Promise/**/*.js',
        'tests/test262/test/built-ins/Proxy/**/*.js',
        'tests/test262/test/built-ins/Reflect/**/*.js',
        'tests/test262/test/built-ins/RegExp/**/*.js',
        'tests/test262/test/built-ins/Set/**/*.js',
        'tests/test262/test/built-ins/SetIteratorPrototype/**/*.js',
        'tests/test262/test/built-ins/SharedArrayBuffer/**/*.js',
        'tests/test262/test/built-ins/Simd/**/*.js',
        'tests/test262/test/built-ins/String/**/*.js',
        'tests/test262/test/built-ins/StringIteratorPrototype/**/*.js',
        'tests/test262/test/built-ins/Symbol/**/*.js',
        'tests/test262/test/built-ins/ThrowTypeError/**/*.js',
        'tests/test262/test/built-ins/TypedArray/**/*.js',
//        'tests/test262/test/built-ins/TypedArrays/**/*.js',
        'tests/test262/test/built-ins/undefined/**/*.js',
        'tests/test262/test/built-ins/WeakMap/**/*.js',
        'tests/test262/test/built-ins/WeakSet/**/*.js',
      ]
    });
  });
}

function readResultsFromFile(filename) {
  return require(path.resolve(filename));
}

function getKeyForTest(test) {
  return [test.file, test.attrs.description].join(' ');
}

function getResultsByKey(results) {
  const byKey = {}
  results.forEach(test => byKey[getKeyForTest(test)] = test);
  return byKey;
}

function getTestType(test) {
  return test.attrs.es5id ? 'es5' :
         test.attrs.es6id ? 'es6' :
         'other';
}

function getTestDescription(test) {
  return test.attrs.description.trim().replace('\n', ' ');
}


function processTestResults() {
  const results = readResultsFromFile(RESULTS_FILE);

  if (argv.save) {
    saveResults(results);
  }

  let total = {
    es6: 0,
    es5: 0,
    other: 0,
  };
  let passed = {
    es6: 0,
    es5: 0,
    other: 0,
  };
  let percent = {};


  results.forEach(test => {
    const type = getTestType(test);
    total[type]++;
    if (test.result.pass) {
      passed[type]++;
    }
    percent[type] = Math.floor(passed[type] / total[type] * 100);
  });

  console.log(`\
Results:
  es5: ${passed.es5}/${total.es5} (${percent.es5}%) passed
  es6: ${passed.es6}/${total.es6} (${percent.es6}%) passed
`);

  if (argv.diff) {
    const oldResults = readResultsFromFile(
      typeof argv.diff === 'string' ? argv.diff : SAVED_RESULTS_FILE
    );
    const resultsByKey = getResultsByKey(oldResults);
    const testsThatDiffer = {regressions: [], fixes: [], other: []};
    let numRegressions = {
      es5: 0,
      es6: 0,
    };
    let numFixes = {
      es5: 0,
      es6: 0,
    };
    let total = {
      es5: 0,
      es6: 0,
    };
    results.forEach(newTest => {
      total[getTestType(newTest)]++;
      const oldTest = resultsByKey[getKeyForTest(newTest)];
      let message;
      let diffList = testsThatDiffer.other;
      if (!oldTest) {
        message = 'This test is new';
      } else if (oldTest.result.pass && !newTest.result.pass) {
        numRegressions[getTestType(newTest)]++;
        message = 'This test regressed';
        diffList = testsThatDiffer.regressions;
      } else if (!oldTest.result.pass && newTest.result.pass) {
        numFixes[getTestType(newTest)]++;
        message = 'This test started passing';
        diffList = testsThatDiffer.fixes;
      } else {
        return;
      }
      diffList.push({
        oldTest,
        newTest,
        message
      });
    });


    if (argv.verbose) {
      const printTest = ({oldTest, newTest, message}, index) => {
        console.log(`  ${index}. ${getTestDescription(newTest)}`);
      }
      console.log('Fixes:')
      testsThatDiffer.fixes.forEach(printTest);
      console.log('\nRegressions:')
      testsThatDiffer.regressions.forEach(printTest);
    }
    console.log(`
Regressions:
  es5: ${numRegressions.es5}/${total.es5}
  es6: ${numRegressions.es6}/${total.es6}
Fixes:
  es5: ${numFixes.es5}/${total.es5}
  es6: ${numFixes.es6}/${total.es6}
`);
  }
}


if (argv.run) {
  runTests(RESULTS_FILE, VERBOSE_RESULTS_FILE).then(processTestResults);
} else {
  processTestResults()
}
