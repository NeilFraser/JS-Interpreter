#!/bin/bash

testfiles=$(find tests/test262/test/language/ -name '*.js' | sort | awk "NR % ${CIRCLE_NODE_TOTAL} == ${CIRCLE_NODE_INDEX}")

if [ -z "$testfiles" ]
then
    echo "more parallelism than tests"
else
    tests/build-test-report.js -rdt 1 $testfiles
fi

mv tests/test-results-new.json $CIRCLE_ARTIFACTS
