# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# Kill the last running process if it exists
if [ -e  'selenium.pid' ]
then
  kill -9 `cat selenium.pid`
  rm selenium.pid
fi

rm selenium.log;
selenium-server > selenium.log 2>&1 &
echo $! > selenium.pid
