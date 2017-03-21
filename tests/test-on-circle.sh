#!/bin/bash
set -x
tests/build-test-report.js -rd --splitInto $CIRCLE_NODE_TOTAL --splitIndex $CIRCLE_NODE_INDEX
t1=$?
mv tests/test-results-new.json $CIRCLE_ARTIFACTS
exit $t1
