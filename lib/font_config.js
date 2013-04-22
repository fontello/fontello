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
//          "orig_css": "twitter",
//          "orig_code": 84,
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
//          "css": "twitter-2",
//          "orig_css": "twitter",
//          ...
//        },
//        ...
//      ],
//      src_fonts: {
//        zocial: '/home/ixti/proj/fontello/assets/embedded_fonts/zocial.ttf',
//        ...
//      },
//      ...
//    }
//


"use strict";


// stdlib
var path = require('path');


// 3rd-party
var _ = require('lodash');


////////////////////////////////////////////////////////////////////////////////


var APP_ROOT = N.runtime.mainApp.root;


////////////////////////////////////////////////////////////////////////////////


// return font configuration
var font_configs = null;
function get_embedded_font(name) {
  if (null === font_configs) {
    font_configs = {};
    require('./embedded_fonts/configs').forEach(function (config) {
      font_configs[config.font.fontname] = config;
    });
  }

  return name ? font_configs[name] : font_configs;
}


var source_fonts;
function get_source_fonts() {
  var fonts_dir;

  if (!source_fonts) {
    source_fonts  = {};
    fonts_dir     = path.join(APP_ROOT, 'assets/embedded_fonts');

    _.each(get_embedded_font(), function (config, name) {
      source_fonts[name] = path.join(fonts_dir, name + '.ttf');
    });
  }

  return source_fonts;
}


function get_used_fonts(glyphs) {
  var fonts = {};

  _.each(glyphs, function (g) {
    if (fonts[g.src]) {
      return;
    }

    fonts[g.src] = get_embedded_font(g.src);
  });

  return _.values(fonts);
}


// return valid glyphs configuration
function get_glyphs_config(params) {
  var glyphs = [];

  if (!_.isArray(params.glyphs)) {
    return glyphs;
  }

  _.each(params.glyphs, function (g) {
    var font = get_embedded_font(g.src), glyph;

    if (!font) {
      // unknown glyph source font
      return;
    }

    // make sure codes are INTEGERS
    g.code = +g.code;
    g.orig_code = +g.code;

    glyph = _.find(font.glyphs, function (config) {
      if (!!config.uid) {
        return config.uid === g.uid;
      }

      return config.code === g.orig_code;
    });

    if (!glyph) {
      // unknown glyph code
      return;
    }

    // make sure glyph config contains all "original" properties
    // as lona as overriden
    glyphs.push(_.extend({}, glyph, g, {
      css:  g.css || glyph.css,
      code: g.code || glyph.code,
      from: glyph.code
    }));
  });

  if (0 === glyphs.length) {
    // at least one glyph is required
    return null;
  }

  // return glyphs config sorted by original codes
  return _.sortBy(glyphs, function (g) { return g.from; });
}


function filter_fontname(str) {
  str = _.isString(str) ? str : '';
  return str.replace(/[^a-z0-9\-_]+/g, '-');
}


module.exports = function fontConfig(params) {
  var glyphs_config, fontname;

  if (!_.isObject(params)) {
    return null;
  }

  glyphs_config = get_glyphs_config(params);
  fontname      = filter_fontname(params.name) || 'fontello';

  return {
    font: {
      fontname:   fontname,
      fullname:   fontname,
      // !!! IMPORTANT for IE6-8 !!!
      // due bug, EOT must have familyname == fontname
      familyname: fontname,
      copyright:  'Copyright (C) 2012 by original authors @ fontello.com',
      ascent:     850,
      descent:    150,
      weight:     'Medium'
    },
    meta: {
      columns: 4,
      css_prefix_text: params.css_prefix_text,
      css_use_suffix: params.css_use_suffix
    },
    glyphs:     glyphs_config,
    src_fonts:  get_source_fonts(),
    used_fonts: get_used_fonts(glyphs_config),
    session:    _.extend(params, { glyphs: glyphs_config })
  };
};
