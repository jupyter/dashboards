if [ ! -e  'selenium.jar' ]
then
  curl http://selenium-release.storage.googleapis.com/2.48/selenium-server-standalone-2.48.2.jar -o selenium.jar
fi

# Kill the last running process if it exists
if [ -e  'selenium.pid' ]
then
  kill -9 `cat selenium.pid`
  rm selenium.pid
fi

rm selenium.log;
java -jar selenium.jar > selenium.log 2>&1 &
echo $! > selenium.pid
