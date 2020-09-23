#!/bin/bash

set -e

cp config/fontello.com.yml.config config/fontello.com.yml

# replace mount point if env variables are defined
sed -i "s/mount: http:\/\/fontello.com/mount: ${FONTELLO_PROTO:-https}:\/\/${FONTELLO_HOST:-fontello.com}/" config/fontello.com.yml

# uncomment `forwarded: true`
sed -i "s/#forwarded: true/forwarded: true/" config/fontello.com.yml

exec "$@"
