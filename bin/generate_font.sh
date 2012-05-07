#!/bin/sh


set -e # die on any unexpected error


## INIT ########################################################################


FONTNAME=$1
TMPDIR=$2
ZIPBALL=$3


CONFIG=$TMPDIR/config.json
JSON_CONFIG=$(node -e "process.stdout.write(JSON.stringify(require('$CONFIG')))")
DEMO_TEMPLATE="$PWD/support/font-demo/demo"
DEMO_HTML_TPL="$PWD/support/font-demo/demo.jade"
DEMO_CSS_TPL="$PWD/support/font-demo/css.mustache"


## HELPERS #####################################################################


require()
{
  if ! $( which $1 > /dev/null ) ; then
    echo "Can't find required command: $1" >&2
    exit 128
  fi
  return 0
}


## PREPARE PATHS ###############################################################


export PATH="$PWD/node_modules/.bin:$PATH"
export PATH="$PWD/support/font-builder/bin:$PATH"
export PATH="$PWD/support/font-builder/support/ttf2eot:$PATH"
export PATH="$PWD/support/font-builder/support/ttfautohint/frontend:$PATH"


## CHECK DEPENDENCIES ##########################################################


for dep in font_merge.py fontconvert.py fontdemo.py ttfautohint ttf2eot jade; do
  require $dep
done


## BUILD FONT ##################################################################


font_merge.py --config "$CONFIG" --dst_font "$TMPDIR/$FONTNAME.ttf"
ttfautohint --latin-fallback --hinting-limit=200 --hinting-range-max=50 \
  --symbol "$TMPDIR/$FONTNAME.ttf" "$TMPDIR/$FONTNAME-hinted.ttf"
mv "$TMPDIR/$FONTNAME-hinted.ttf" "$TMPDIR/$FONTNAME.ttf"
fontconvert.py --src_font "$TMPDIR/$FONTNAME.ttf" --fonts_dir "$TMPDIR"
ttf2eot < "$TMPDIR/$FONTNAME.ttf" > "$TMPDIR/$FONTNAME.eot"


## BUILD DEMO ##################################################################


cp -r "$DEMO_TEMPLATE" "$TMPDIR/demo"
jade --pretty --obj "$JSON_CONFIG" --out "$TMPDIR" "$DEMO_HTML_TPL"
fontdemo.py -c "$CONFIG" "$DEMO_CSS_TPL" "$TMPDIR/$FONTNAME.css"


## BUILD ZIPBALL ###############################################################


rm $CONFIG && rm -rf $ZIPBALL && mkdir -p $(dirname $ZIPBALL)
cd $(dirname $TMPDIR) && zip $ZIPBALL -r ./$(basename $TMPDIR)
exit 0
