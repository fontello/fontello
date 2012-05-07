#!/bin/sh

MERGE_CFG=$1
FONT_CFG=$2
ZIPBALL=$3
ZIPDIR=$(dirname $ZIPBALL)

rm -rf $ZIPDIR && mkdir -p $ZIPDIR && touch $ZIPBALL
