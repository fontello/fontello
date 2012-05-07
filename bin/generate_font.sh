#!/bin/sh

FONTNAME=$1
TMPDIR=$2
ZIPBALL=$3

CONFIG=$TMPDIR/config.json

rm -rf $(dirname $ZIPBALL) && mkdir -p $(dirname $ZIPBALL) && touch $ZIPBALL
exit 0


font_merge.py --config "$CONFIG" --dst_font "$TMPDIR/$FONTNAME.ttf"
ttfautohint --latin-fallback --hinting-limit=200 --hinting-range-max=50 \
  --symbol "$TMPDIR/$FONTNAME.ttf" "$TMPDIR/$FONTNAME-hinted.ttf" \
  && mv "$TMPDIR/$FONTNAME-hinted.ttf" "$TMPDIR/$FONTNAME.ttf"
fontconvert.py --src_font "$TMPDIR/$FONTNAME.ttf" --fonts_dir "$TMPDIR"
ttf2eot < "$TMPDIR/$FONTNAME.ttf" > "$TMPDIR/$FONTNAME.eot"


mkdir "$TMPDIR/demo"
JSON_CONFIG=$(node "process.stdout.write(JSON.stringify(require('$CONFIG')))")
jade --pretty --obj "$JSON_CONFIG" --out "$TMPDIR/demo" "$DEMO_HTML_TPL"
fontdemo.py -c "$CONFIG" "$DEMO_CSS_TPL" "$TMPDIR/demo/$FONTNAME.css"


zip -r $TMPDIR $ZIPBALL
