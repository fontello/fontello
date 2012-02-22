#!/bin/bash

# this script generates js/fm-embedded-fonts.js
SCRIPT_PATH="$(pwd)/$0"
ROOT_DIR=${SCRIPT_PATH%/*/*}
BIN_DIR="${ROOT_DIR}/bin"
FONT_DIR="${ROOT_DIR}/sample-fonts"
JS_DIR="${ROOT_DIR}/js"
FIX_ENTYPO_SCRIPT="${BIN_DIR}/fix_entypo.pe"

FONTS=(entypo-webfont.svg iconic_fill.svg iconic_stroke.svg websymbols.svg)
FLEN=${#FONTS[@]}
FONT_ENTYPO=Entypo.otf
FONT_ENTYPO_FIXED=entypo-webfont.svg
OUTPUT_FILE="${JS_DIR}/fm-embedded-fonts.js"

function js_escape() {
    s=$1
    s=${s//\\/\\\\}
    s=${s//$'\n'/\\n}
    s=${s//\"/\\\"}
    echo $s
}

echo "Converting and fixing ${FONT_ENTYPO}..."
${FIX_ENTYPO_SCRIPT} "${FONT_DIR}/${FONT_ENTYPO}" "${FONT_DIR}/${FONT_ENTYPO_FIXED}"
echo "done"
echo -n "Fixing ascent and descent... "
sed -i 's/ascent="[^"]*"/ascent="800"/' ${FONT_DIR}/${FONT_ENTYPO_FIXED}
sed -i 's/descent="[^"]*"/descent="-200"/' ${FONT_DIR}/${FONT_ENTYPO_FIXED}
echo "done"

echo -n "Generating $OUTPUT_FILE... "
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

echo "done"
