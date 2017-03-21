#!/bin/bash
set -x
tests/build-test-report.js -rd --splitInto $CIRCLE_NODE_TOTAL --splitIndex $CIRCLE_NODE_INDEX --progress

mv tests/test-results-new.json $CIRCLE_ARTIFACTS
