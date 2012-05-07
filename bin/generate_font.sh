#!/bin/sh

FONTNAME=$1
TMPDIR=$2
ZIPBALL=$3

CONFIG=$TMPDIR/config.json

rm -rf $(dirname $ZIPBALL) && mkdir -p $(dirname $ZIPBALL) && touch $ZIPBALL
exit 0
