/*global nodeca, _*/


"use strict";


// stdlib
var path      = require('path');


////////////////////////////////////////////////////////////////////////////////


var APP_ROOT = nodeca.runtime.apps[0].root;


////////////////////////////////////////////////////////////////////////////////


// return font configuration
var font_configs = null;
function get_embedded_font(name) {
  if (null === font_configs) {
    font_configs = {};
    nodeca.shared.fontomas.embedded_fonts.forEach(function (config) {
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

    glyphs.push({
      src:  g.src,
      uid:  g.uid,
      css:  g.css || glyph.css,
      from: glyph.code,
      code: g.code || glyph.code
    });
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
      ascent:     800,
      descent:    200,
      weight:     'Medium'
    },
    meta: {
      columns: 4,
      css_prefix: 'icon-'
    },
    glyphs:     glyphs_config,
    src_fonts:  get_source_fonts(),
    used_fonts: get_used_fonts(glyphs_config),
    session:    params
  };
};
