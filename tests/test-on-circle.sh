#!/bin/bash
set -x
`npm bin`/js-interpreter-tyrant --threads 1 -run --diff --verbose --splitInto $CIRCLE_NODE_TOTAL --splitIndex $CIRCLE_NODE_INDEX
t1=$?
mv tyrant/test-results-new.json $CIRCLE_ARTIFACTS
exit $t1
