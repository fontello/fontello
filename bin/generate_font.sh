#!/bin/sh


set -e # die on any unexpected error


## INIT ########################################################################


FONTNAME=$1
TMPDIR=$2
ZIPBALL=$3

USER_CONFIG=$TMPDIR/config.json
CONFIG=$TMPDIR/generator-config.json
FONT_TEMPLATES="$PWD/support/font-templates"


mkdir $TMPDIR/css $TMPDIR/font


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


export PATH="$PWD/bin:$PATH"
export PATH="$PWD/node_modules/.bin:$PATH"
export PATH="$PWD/support/font-builder/bin:$PATH"
export PATH="$PWD/support/font-builder/support/ttf2eot:$PATH"
export PATH="$PWD/support/font-builder/support/ttfautohint/frontend:$PATH"


## CHECK DEPENDENCIES ##########################################################


for dep in font_merge.py fontconvert.py fontdemo.py ttfautohint ttf2eot jade zip; do
  require $dep
done


## BUILD FONT CONFIG ###########################################################


node ./fontello.js font_config --input $USER_CONFIG --output $CONFIG


## BUILD FONT ##################################################################


font_merge.py --config "$CONFIG" --dst_font "$TMPDIR/font/$FONTNAME.ttf"
ttfautohint --latin-fallback --hinting-limit=200 --hinting-range-max=50 \
  --symbol "$TMPDIR/font/$FONTNAME.ttf" "$TMPDIR/font/$FONTNAME-hinted.ttf"
mv "$TMPDIR/font/$FONTNAME-hinted.ttf" "$TMPDIR/font/$FONTNAME.ttf"
fontconvert.py --src_font "$TMPDIR/font/$FONTNAME.ttf" --fonts_dir "$TMPDIR/font"
ttf2eot < "$TMPDIR/font/$FONTNAME.ttf" > "$TMPDIR/font/$FONTNAME.eot"


## BUILD TEMPLATES #############################################################


tpl-render.js --locals "$CONFIG" --input "$FONT_TEMPLATES/demo.jade" \
  --output "$TMPDIR/demo.html" --pretty

tpl-render.js --locals "$CONFIG" --input "$FONT_TEMPLATES/css/css.jade" \
  --output "$TMPDIR/css/$FONTNAME.css"

tpl-render.js --locals "$CONFIG" --input "$FONT_TEMPLATES/css/css-ie7.jade" \
  --output "$TMPDIR/css/$FONTNAME-ie7.css"

tpl-render.js --locals "$CONFIG" --input "$FONT_TEMPLATES/css/css-codes.jade" \
  --output "$TMPDIR/css/$FONTNAME-codes.css"

tpl-render.js --locals "$CONFIG" --input "$FONT_TEMPLATES/css/css-ie7-codes.jade" \
  --output "$TMPDIR/css/$FONTNAME-ie7-codes.css"

cp "$FONT_TEMPLATES/css/animation.css" "$TMPDIR/css/animation.css"

tpl-render.js --locals "$CONFIG" --input "$FONT_TEMPLATES/LICENSE.jade" \
  --output "$TMPDIR/LICENSE.txt"

cp "$FONT_TEMPLATES/README.txt" "$TMPDIR/"



WOFF64=$(base64 -w0 "$TMPDIR/font/$FONTNAME.woff")
TTF64=$(base64 -w0 "$TMPDIR/font/$FONTNAME.ttf")
tpl-render.js --locals "$CONFIG" --input "$FONT_TEMPLATES/css/css-embedded.jade" \
  --output "$TMPDIR/css/$FONTNAME-embedded.css"
sed -i "s|%WOFF64%|$WOFF64|" "$TMPDIR/css/$FONTNAME-embedded.css"
sed -i "s|%TTF64%|$TTF64|" "$TMPDIR/css/$FONTNAME-embedded.css"




## BUILD ZIPBALL ###############################################################


MAXLEN=$(expr $(echo -n $TMPDIR | wc -c) - 24)
FIXDIR=$(echo -n $TMPDIR | cut -c-$MAXLEN)

rm $CONFIG && rm -rf $ZIPBALL && mkdir -p $(dirname $ZIPBALL)
cd $(dirname $TMPDIR)

cp -r "$TMPDIR" "$FIXDIR"
zip $ZIPBALL -r ./$(basename $FIXDIR)
rm -rf $FIXDIR

exit 0
