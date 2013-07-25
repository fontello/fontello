// Converts fonts config from the client (sent when user clicks Download button)
// into a config suitable for the font builder.
//
// Client config structure:
//
//   name:
//   css_prefix_text:
//   css_use_suffix:
//   hinting:
//   glyphs:
//     - uid:
//       src: fontname
//       code: codepoint
//       css:
//
//     - ...
//
// Resulting builder config:
//
//   font:
//     fontname:
//     fullname:
//     familyname:
//     copyright:
//     ascent:
//     descent:
//     weight:
//
//   meta:
//     columns:
//     css_prefix_text:
//     css_use_suffix:
//
//   glyphs:
//     - src:
//       from: codepoint
//       code: codepoint
//       css:
//       css-ext:
//
//     - ...
//
//   fonts_list:
//     -     
//      font:
//      meta:
//


'use strict';


var _ = require('lodash');


var fontConfigs = require('../../../lib/embedded_fonts/server_config');


function collectGlyphsInfo(input) {
  var result = [];

  _.forEach(input, function (inputGlyph) {
    var fontGlyph = fontConfigs.uids[inputGlyph.uid];

    if (!fontGlyph) {
      // Unknown glyph UID.
      return;
    }

    result.push({
      src:       fontGlyph.fontname
    , uid:       inputGlyph.uid
    , from:      fontGlyph.code
    , code:      Number(inputGlyph.code || fontGlyph.code)
    , css:       inputGlyph.css || fontGlyph.css
    , 'css-ext': fontGlyph['css-ext']
    , heigh:     fontGlyph.svg.height
    , width:     fontGlyph.svg.width
    , d:         fontGlyph.svg.d
    });
  });

  // Sort result by original codes.
  result.sort(function (a, b) { return a.from - b.from; });

  return result;
}


function collectFontsInfo(glyphs) {
  var result = [];

  _(glyphs).pluck('src').unique().forEach(function (fontname) {
    result.push({
      font : fontConfigs.fonts[fontname],
      meta : fontConfigs.metas[fontname]
    });
  });

  return result;
}


module.exports = function fontConfig(clientConfig) {
  var fontname, glyphsInfo, fontsInfo;

  if (!_.isObject(clientConfig)) {
    return null;
  }

  if (!_.isEmpty(clientConfig.name)) {
    fontname = String(clientConfig.name).replace(/[^a-z0-9\-_]+/g, '-');
  } else {
    fontname = 'fontello';
  }

  glyphsInfo = collectGlyphsInfo(clientConfig.glyphs);
  fontsInfo  = collectFontsInfo(glyphsInfo);

  if (_.isEmpty(glyphsInfo) || _.isEmpty(fontsInfo)) {
    return null;
  }

  return {
    font: {
      fontname:   fontname
    , fullname:   fontname
      // !!! IMPORTANT for IE6-8 !!!
      // due bug, EOT requires `familyname` begins `fullname`
      // https://github.com/fontello/fontello/issues/73?source=cc#issuecomment-7791793
    , familyname: fontname
    , copyright:  'Copyright (C) 2012 by original authors @ fontello.com'
    , ascent:     850
    , descent:    -150
    , weight:     400
    }
  , hinting : clientConfig.hinting !== false
  , meta: {
      columns: 4 // Used by the demo page.
      // Set defaults if fields not exists in config
    , css_prefix_text: clientConfig.css_prefix_text || 'icon-'
    , css_use_suffix:  Boolean(clientConfig.css_use_suffix)
    }
  , glyphs:     glyphsInfo
  , fonts_list: fontsInfo
  };
};
