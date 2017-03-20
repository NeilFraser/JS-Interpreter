#!/bin/bash

tests/build-test-report.js -rdt 1 --splitInto $CIRCLE_NODE_TOTAL --splitIndex $CIRCLE_NODE_INDEX

mv tests/test-results-new.json $CIRCLE_ARTIFACTS
