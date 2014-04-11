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
// For custom icons
//
//       selected: flag
//       svg:
//         - path:
//           width:
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
var svgpath = require('svgpath');


var fontConfigs = require('../../../lib/embedded_fonts/server_config');

function collectGlyphsInfo(clientConfig) {
  var result = [];
  var scale = clientConfig.units_per_em / 1000;

  _.forEach(clientConfig.glyphs, function (glyph) {
    var sp;

    if(glyph.src === 'custom_icons') {

      // for custom glyphs use only selected ones      
      if (!glyph.selected) { return; }

      sp = svgpath(glyph.svg.path)
              .scale(scale, -scale)
              .translate(0, clientConfig.ascent)
              .abs().round(0).rel();

      result.push({
        src:      glyph.src
      , uid:      glyph.uid
      , code:     glyph.code
      , css:      glyph.css
      , width:    +(glyph.svg.width * scale).toFixed(1)
      , d:        sp.toString()
      , segments: sp.segments.length
      });
      return;
    }

    // For exmbedded fonts take pregenerated info

    var glyphEmbedded = fontConfigs.uids[glyph.uid];
    if (!glyphEmbedded) { return; }

    sp = svgpath(glyphEmbedded.svg.d)
            .scale(scale, -scale)
            .translate(0, clientConfig.ascent)
            .abs().round(0).rel();

    result.push({
      src:        glyphEmbedded.fontname
    , uid:        glyph.uid
    , code:       glyph.code || glyphEmbedded.code
    , css:        glyph.css || glyphEmbedded.css
    , 'css-ext':  glyphEmbedded['css-ext']
    , width:      +(glyphEmbedded.svg.width * scale).toFixed(1)
    , d:        sp.toString()
    , segments: sp.segments.length
    });

  });

  // Sort result by original codes.
  result.sort(function (a, b) { return a.code - b.code; });

  return result;
}

// collect fonts metadata required to build license info

function collectFontsInfo(glyphs) {
  var result = [];

  _(glyphs).pluck('src').unique().forEach(function (fontname) {
    var font = fontConfigs.fonts[fontname];
    var meta = fontConfigs.metas[fontname];

    if (font && meta) {
      result.push({ font : font, meta : meta });
    }

  });
  return result;
}


module.exports = function fontConfig(clientConfig) {

  var fontname, glyphsInfo, fontsInfo;

  //
  // Patch broken data to fix original config
  //
  if (clientConfig.fullname === 'undefined') { delete clientConfig.fullname; }
  if (clientConfig.copyright === 'undefined') { delete clientConfig.copyright; }

  //
  // Fill default values, until replace `revalidator` with something better
  // That's required for old `config.json`-s.
  //

  clientConfig.css_use_suffix   = Boolean(clientConfig.css_use_suffix);
  clientConfig.css_prefix_text  = clientConfig.css_prefix_text || 'icon-';
  clientConfig.hinting          = (clientConfig.hinting !== false);
  clientConfig.units_per_em     = +clientConfig.units_per_em || 1000;
  clientConfig.ascent           = +clientConfig.ascent || 850;

  //
  // Start creating builder config
  //

  if (!_.isEmpty(clientConfig.name)) {
    fontname = String(clientConfig.name).replace(/[^a-z0-9\-_]+/g, '-');
  } else {
    fontname = 'fontello';
  }

  glyphsInfo = collectGlyphsInfo(clientConfig);
  fontsInfo  = collectFontsInfo(glyphsInfo);

  if (_.isEmpty(glyphsInfo)) {
    return null;
  }

  var defaultCopyright = 'Copyright (C) ' + new Date().getFullYear() + ' by original authors @ fontello.com';

  return {
    font: {
      fontname:   fontname
    , fullname:   fontname
      // !!! IMPORTANT for IE6-8 !!!
      // due bug, EOT requires `familyname` begins `fullname`
      // https://github.com/fontello/fontello/issues/73?source=cc#issuecomment-7791793
    , familyname: fontname
    , copyright:  !_.isEmpty(fontsInfo) ? defaultCopyright : (clientConfig.copyright || defaultCopyright)
    , ascent:     clientConfig.ascent
    , descent:    clientConfig.ascent - clientConfig.units_per_em
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
