#!/bin/bash

# this script generates js/fm-embedded-fonts.js

#FONTS=( $(ls -1 sample-fonts/*.svg) )
FONT_DIR="sample-fonts"
FONTS=(iconic_fill.svg iconic_stroke.svg websymbols.svg)
FLEN=${#FONTS[@]}
OUTPUT_FILE="js/fm-embedded-fonts.js"

function myescape() {
    s=$1
    s=${s//\\/\\\\}
    s=${s//$'\n'/\\n}
    s=${s//\"/\\\"}
    echo $s
}

(echo "var fm_embedded_fonts = ["
for (( i=0; i<${FLEN}; i++ ));
do
    file=$(cat ${FONT_DIR}/${FONTS[$i]})
    file=$(myescape "$file")
    echo "    {"
    echo "        is_loaded: 0,"
    echo "        name: \"\","
    echo "        size: \"\","
    echo "        type: \"\","
    echo -n "        content:"
    echo \"$file\"
    echo -n "    }"
    if [ $(($i+1)) -ne ${FLEN} ]; then echo ","; fi
done;

echo
echo "];") > $OUTPUT_FILE
