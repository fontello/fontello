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

mv $TMPDIR/font.svg $TMPDIR/font/$FONTNAME.svg

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


#export PATH="$PWD/bin:$PATH"
export PATH="$PWD/node_modules/.bin:$PATH"
#export PATH="$PWD/support/font-builder/bin:$PATH"
export PATH="$PWD/support/font-builder/support/ttfautohint/frontend:$PATH"


## CHECK DEPENDENCIES ##########################################################


for dep in ttfautohint zip; do
  require $dep
done


## BUILD FONT ##################################################################

fontforge -c "font = fontforge.open('$TMPDIR/font/$FONTNAME.svg'); font.generate('$TMPDIR/font/$FONTNAME.ttf')"
ttfautohint --latin-fallback --no-info --windows-compatibility \
  --symbol "$TMPDIR/font/$FONTNAME.ttf" "$TMPDIR/font/$FONTNAME-hinted.ttf"
mv "$TMPDIR/font/$FONTNAME-hinted.ttf" "$TMPDIR/font/$FONTNAME.ttf"
ttf2eot < "$TMPDIR/font/$FONTNAME.ttf" > "$TMPDIR/font/$FONTNAME.eot"

./node_modules/.bin/ttf2eot "$TMPDIR/font/$FONTNAME.ttf" "$TMPDIR/font/$FONTNAME.eot"
./node_modules/.bin/ttf2woff "$TMPDIR/font/$FONTNAME.ttf" "$TMPDIR/font/$FONTNAME.woff"


## BUILD TEMPLATES #############################################################

# here we can't use pipes, because teplate has @import directive
jade --obj "$CONFIG" --out "$TMPDIR" --pretty "$FONT_TEMPLATES/demo.jade"

jade --obj "$CONFIG" --pretty < "$FONT_TEMPLATES/css/css.jade" > "$TMPDIR/css/$FONTNAME.css"
jade --obj "$CONFIG" --pretty < "$FONT_TEMPLATES/css/css-ie7.jade" > "$TMPDIR/css/$FONTNAME-ie7.css"
jade --obj "$CONFIG" --pretty < "$FONT_TEMPLATES/css/css-codes.jade" > "$TMPDIR/css/$FONTNAME-codes.css"
jade --obj "$CONFIG" --pretty < "$FONT_TEMPLATES/css/css-ie7-codes.jade" > "$TMPDIR/css/$FONTNAME-ie7-codes.css"

cp "$FONT_TEMPLATES/css/animation.css" "$TMPDIR/css/animation.css"

jade --obj "$CONFIG" --pretty < "$FONT_TEMPLATES/LICENSE.jade" > "$TMPDIR/LICENSE.txt"

cp "$FONT_TEMPLATES/README.txt" "$TMPDIR/"


WOFF64=$(base64 -w0 "$TMPDIR/font/$FONTNAME.woff")
TTF64=$(base64 -w0 "$TMPDIR/font/$FONTNAME.ttf")
jade --obj "$CONFIG" --pretty <  "$FONT_TEMPLATES/css/css-embedded.jade" > "$TMPDIR/css/$FONTNAME-embedded.css"

# send replace command via pipe, otherwise sed fails on long arguments
echo "s|%WOFF64%|$WOFF64|" | sed -i -f - "$TMPDIR/css/$FONTNAME-embedded.css"
echo "s|%TTF64%|$TTF64|" | sed -i -f - "$TMPDIR/css/$FONTNAME-embedded.css"


## BUILD ZIPBALL ###############################################################


MAXLEN=$(expr $(echo -n $TMPDIR | wc -c) - 24)
FIXDIR=$(echo -n $TMPDIR | cut -c-$MAXLEN)

rm $CONFIG && rm -rf $ZIPBALL && mkdir -p $(dirname $ZIPBALL)
cd $(dirname $TMPDIR)

cp -r "$TMPDIR" "$FIXDIR"
zip $ZIPBALL -r ./$(basename $FIXDIR)
rm -rf $FIXDIR

exit 0
