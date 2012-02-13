#!/bin/bash

# this script generates js/fm-embedded-fonts.js

#FONTS=( $(ls -1 sample-fonts/*.svg) )
FONT_DIR="sample-fonts"
FONTS=(iconic_fill.svg iconic_stroke.svg websymbols.svg)
FLEN=${#FONTS[@]}
OUTPUT_FILE="js/fm-embedded-fonts.js"

function js_escape() {
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
    file=$(js_escape "$file")
    echo    "    {"
    echo    "        id: $i,"               # index in the array
    echo    "        filename: \"${FONTS[$i]}\","   # font filename
    echo    "        filetype: \"unknown\","     # mime type
    echo    "        is_ok: false,"         # font parsed and ready to use
    echo    "        is_added: false,"      # font added into "select icons"
    echo    "        fontname: \"unknown\","    # font name
    echo    "        content: \"$file\""    # font file content
    echo -n "    }"
    if [ $(($i+1)) -ne ${FLEN} ]; then echo ","; fi
done;

echo
echo "];") > $OUTPUT_FILE
