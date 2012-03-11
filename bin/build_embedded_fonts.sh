#!/bin/bash

# this script generates js/fm-embedded-fonts.js
SCRIPT_PATH="$(pwd)/$0"
ROOT_DIR=${SCRIPT_PATH%/*/*}
BIN_DIR="${ROOT_DIR}/bin"
FONT_DIR="${ROOT_DIR}/fonts"
JS_DIR="${ROOT_DIR}/public/js/fontomas"
FIX_ENTYPO_SCRIPT="${BIN_DIR}/entypo_rescale.pe"

FONTS=(entypo_rescaled.svg iconic_fill.svg iconic_stroke.svg websymbols.svg fontawesome-webfont.svg)
FLEN=${#FONTS[@]}
FONT_ENTYPO=Entypo.otf
FONT_ENTYPO_FIXED=entypo_rescaled.svg
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

echo -n "Generating $OUTPUT_FILE... "
(cat <<END
var Fontomas = (function (Fontomas) {
  "use strict";

  Fontomas.embedded_fonts = [
END

for (( i=0; i<${FLEN}; i++ ));
do
    file=$(cat ${FONT_DIR}/${FONTS[$i]})
    file=$(js_escape "$file")
    echo    "    {"
    echo    "      id: $i,"               # index in the array
    echo    "      filename: \"${FONTS[$i]}\","   # font filename
    echo    "      filetype: \"unknown\","     # mime type
    echo    "      is_ok: false,"         # font parsed and ready to use
    echo    "      is_added: false,"      # font added into "select icons"
    echo    "      fontname: \"unknown\","    # font name
    echo    "      content: \"$file\""    # font file content
    echo -n "    }"
    if [ $(($i+1)) -ne ${FLEN} ]; then echo ","; fi
done;

cat <<END

  ];

  return Fontomas;
}(Fontomas || {}));
END
) > $OUTPUT_FILE

echo "done"
