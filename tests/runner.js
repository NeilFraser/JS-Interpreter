/**
 * This duplicates some of the code in test262-harness/bin/run.js, but
 * wraps it inside a function that can be executed programmatically rather
 * than just being a script that executes immediately upon import.
 */

const compile = require('test262-compiler');
const fs = require('fs');
const path = require('path');
const Rx = require('rx');
const agentPool = require('test262-harness/lib/agentPool.js');
const globber = require('test262-harness/lib/globber.js');
const resultsEmitter = require('test262-harness/lib/resultsEmitter.js');
const scenariosForTest = require('test262-harness/lib/scenarios.js');
const test262Finder = require('test262-harness/lib/findTest262.js');
const validator = require('test262-harness/lib/validator.js');

const DEFAULT_TEST_TIMEOUT = 10000;

module.exports = {
  /**
   * @param {Object} argv
   * @param {string} [argv.test262Dir] - Root test262 directory and is used to locate the includes directory.
   * @param {string} [argv.includesDir] - Includes directory. By default inferred from test262Dir or else
   *     detected by walking upward from the first test found.
   * @param {string} [argv.hostType] - Type of host to run tests in.
   *     See eshost's supported hosts for available options.
   * @param {string} [argv.hostPath] - Path to the host executable.
   * @param {string[]} [argv.hostArgs] - Any additional arguments to pass to the host when invoking it (eg.
   *     --harmony, --es6all, etc).
   * @param {number} [argv.threads] - Run this many tests in parallel. Note that the browser runners don't
   *     work great with t > 1.
   * @param {number} [argv.timeout] - ms to wait for a test to complete before failing it
   * @param {string} [argv.prelude] - Path to a file to include before every test (useful for testing polyfills
   *     for example)
   * @param {Function} [argv.reporter] - Function to call that hooks up results stream to a reporter of some kind
   * @param {string[]} [argv.globs] - List of path globs to test files.
   * @param {string} [argv.compiledFilesDir] - Directory to store compiled test files that get run.
   */
  run(argv) {
    let test262Dir = argv.test262Dir;
    let includesDir = argv.includesDir;
    let preludeContents = argv.prelude || '';
    argv.timeout = argv.timeout || DEFAULT_TEST_TIMEOUT;
    const pool = agentPool(
      Number(argv.threads),
      argv.hostType,
      argv.hostArgs,
      argv.hostPath,
      {
        timeout: argv.timeout
      }
    );
    const paths = globber(argv.globs);
    if (!includesDir && !test262Dir) {
      test262Dir = test262Finder(paths.fileEvents[0]);
    }
    const files = paths.map(pathToTestFile);
    const tests = files.map(compileFile);
    const scenarios = tests.flatMap(scenariosForTest);
    const pairs = Rx.Observable.zip(pool, scenarios);
    const rawResults = pairs.flatMap(pool.runTest).tapOnCompleted(() => pool.destroy());;
    const results = rawResults.map(function (test) {
      test.result = validator(test);
      return test;
    });
    const resultEmitter = resultsEmitter(results);
    argv.reporter(resultEmitter);

    function pathToTestFile(path) {
      return { file: path, contents: fs.readFileSync(path, 'utf-8')};
    }

    const endFrontmatterRe = /---\*\/\r?\n/g;
    function compileFile(test) {
      const match = endFrontmatterRe.exec(test.contents);
      if (match) {
        test.contents = test.contents.slice(0, endFrontmatterRe.lastIndex)
                      + preludeContents
                      + test.contents.slice(endFrontmatterRe.lastIndex);
      } else {
        test.contents = preludeContents + test.contents;
      }
      const compiledTest = compile(test, { test262Dir: test262Dir, includesDir: includesDir });
      if (argv.compiledFilesDir) {
        const outPath = path.join(argv.compiledFilesDir, test.file.replace(test262Dir, ''));
        outPath.split('/').reduce(function(prev, curr, i) {
          if (prev && !fs.existsSync(prev)) {
            fs.mkdirSync(prev);
          }
          return prev + '/' + curr;
        });
        fs.writeFileSync(outPath, compiledTest.contents)
      }
      return compiledTest;
    }
  }
};
