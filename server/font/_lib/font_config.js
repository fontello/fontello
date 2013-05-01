// Expands user config (sent when user clicks Download button, or the one that
// saved within generated font) into the full config suitable for font builder
// and demo generator.
//
// User (input) config contains only information provided by UI: desired
// font name, list of glyphs (each one ha it's uid, original and user defined
// code and css, original meta information and source font id):
//
//    {
//      name: "foobar",
//      css_prefix_text: "icon-",
//      css_use_suffix: false
//      glyphs: [
//        {
//          "search": [ "twitter" ],
//          "code": 84,
//          "uid": "b1ec8e90c2c85cf0035849980a3789b3",
//          "css": "twitter-2",
//          "src": "zocial",
//          "from": 84
//        },
//        ...
//      ]
//    }
//
//  Prepared config (output) contains extensive information needed to build
//  font and it's demo: fontname, fontfamily, license, copyrights, where to
//  find source font files:
//
//    {
//      meta: {
//        columns: 4
//        css_prefix_text: "icon-",
//        css_use_suffix: false
//      }
//      font: {
//        fontname: 'tada',
//        ...
//        copyright: 'Copyright (C) 2012 by original authors @ fontello.com',
//        ascent: 850,
//        ...
//      },
//      glyphs: [
//        {
//          ...
//          "uid": "b1ec8e90c2c85cf0035849980a3789b3",
//          "css": "twitter-2"
//          ...
//        },
//        ...
//      ],
//      src_fonts: {
//        zocial: '/home/ixti/proj/fontello/assets/embedded_fonts/zocial.ttf',
//        ...
//      },
//      used_fonts: [
//        { /* full config of the used font, i.e. config.yml file */ },
//        ...
//      ]
//    }
//


'use strict';


var _    = require('lodash');
var path = require('path');


var fontConfigs       = require('../../../lib/embedded_fonts/configs');
var fontConfigsByName = {};
var fontPathsByName   = {};

_.forEach(fontConfigs, function (config) {
  var name = config.font.fontname;

  fontConfigsByName[name] = config;
  fontPathsByName[name] = path.join(__dirname, '../../../assets/embedded_fonts', name + '.ttf');
});


// Returns valid glyphs configuration.
//
function normalizeGlyphs(input) {
  if (!_.isArray(input)) {
    return null;
  }

  var result = [];

  _.forEach(input, function (inputGlyph) {
    var fontConfig = fontConfigsByName[inputGlyph.src]
      , fontGlyph  = null;

    if (!fontConfig) {
      // Unknown glyph source font.
      return;
    }

    fontGlyph = _.find(fontConfig.glyphs, function (config) {
      return config.uid === inputGlyph.uid;
    });

    if (!fontGlyph) {
      // Unknown glyph UID.
      return;
    }

    inputGlyph.code = Number(inputGlyph.code || fontGlyph.code);
    inputGlyph.css  = inputGlyph.css || fontGlyph.css;

    // Make sure glyph config contains all properties from original font as long
    // as the overriden.
    result.push(_.defaults(inputGlyph, fontGlyph, { from: fontGlyph.code }));
  });

  if (_.isEmpty(result)) {
    // At least one glyph is required.
    return null;
  }

  // Sort result by original codes.
  result.sort(function (a, b) { return a.from - b.from; });

  return result;
}


module.exports = function fontConfig(params) {
  var fontname, fonts, glyphs;

  if (!_.isObject(params)) {
    return null;
  }

  if (_.isString(params.name)) {
    fontname = params.name.replace(/[^a-z0-9\-_]+/g, '-');
  } else {
    fontname = 'fontello';
  }

  glyphs = normalizeGlyphs(params.glyphs);

  fonts = _.select(fontConfigs, function (config) {
    return _.detect(glyphs, { src: config.font.fontname });
  });

  return {
    font: {
      fontname:   fontname
    , fullname:   fontname
      // !!! IMPORTANT for IE6-8 !!!
      // due bug, EOT must have familyname == fontname
    , familyname: fontname
    , copyright:  'Copyright (C) 2012 by original authors @ fontello.com'
    , ascent:     850
    , descent:    150
    , weight:     'Medium'
    }
  , meta: {
      columns: 4 // Used by the demo page.
    , css_prefix_text: params.css_prefix_text
    , css_use_suffix:  params.css_use_suffix
    }
  , glyphs:     glyphs
  , src_fonts:  fontPathsByName
  , used_fonts: fonts
  };
};
