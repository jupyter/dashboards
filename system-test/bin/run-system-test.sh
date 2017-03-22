#!/bin/bash
# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

TEST_SERVER=${TEST_SERVER:-127.0.0.1:4444}
TEST_TYPE=${TEST_TYPE:-local}

kill $(cat /tmp/selenium.pid)
kill $(cat /tmp/notebook.pid)

# Start selenium if local
if [[ "$TEST_TYPE" == "local" ]]; then
    set -e
    which chromedriver || (echo "chromedriver not found"; exit 1)
    which selenium-server || (echo "selenium-server not found"; exit 1)
    set +e
    selenium-server -port 4444 &
    echo $! > /tmp/selenium.pid
fi

# Start the notebook server
source activate dashboards
jupyter notebook --ip 127.0.0.1 \
    --port 8888 \
    --notebook-dir=./etc/notebooks \
    --no-browser \
    --NotebookApp.token='' &
echo $! > /tmp/notebook.pid

# Run the tests
npm run system-test -- \
    --baseurl "http://127.0.0.1:8888" \
    --server "$TEST_SERVER" \
    --test-type "$TEST_TYPE"

kill $(cat /tmp/selenium.pid)
kill $(cat /tmp/notebook.pid)
