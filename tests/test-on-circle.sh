#!/bin/bash

if [ ! -d tests/test262 ]; then
    echo "Checking out tests"
    git clone https://github.com/tc39/test262.git --depth 1 tests/test262
fi

testfiles=$(find tests/test262/test/language/ -name '*.js' | sort | awk "NR % ${CIRCLE_NODE_TOTAL} == ${CIRCLE_NODE_INDEX}")

if [ -z "$testfiles" ]
then
    echo "more parallelism than tests"
else
    tests/build-test-report.js -rdt 1 $testfiles
fi
