#!/usr/bin/env bash

set -e


PIDFILE="tmp/forever.pid"
WATCH_PATHS="assets client config lib node_modules server src support"


start_fontello() {
  ( kill -9 $(cat $PIDFILE) 2>/dev/null) || true
  ( node ./fontello.js server & echo $! > $PIDFILE ) || true
}


# handle Ctrl+C
trap "cat $PIDFILE | xargs kill" SIGINT SIGTERM


# make sure pidfile can be created
mkdir -p $(dirname $PIDFILE)
touch $PIDFILE


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
