#!/usr/bin/env sh

FONTELLO_PID=""
WATCH_PATHS="assets client config node_modules shared server src support views"

start_fontello() {
  test "x" != "x$FONTELLO_PID" && kill -9 $FONTELLO_PID
  node ./fontello.js server & FONTELLO_PID=$!
}

# Initial start
start_fontello

inotifywait -m -r --format '%w%f' -e modify -e move -e create -e delete $WATCH_PATHS | while read f ; do
  # when not excluded
  (echo $f | egrep -v -q '\.swpx?$|/\.git/') && \
    # and actually included
    (echo $f | egrep -q '\.(js|css|styl|less|ejs|jade)$') && \
      # restart server
      start_fontello
done
