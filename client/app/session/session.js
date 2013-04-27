// - Save/Load session
// - Autoload on start

"use strict";


var _ = require('lodash');


var SERIALIZER_VERSION = 3;
var STORAGE_KEY        = 'fontello:sessions';
var KNOWN_FONT_IDS     = {};


// Fill in known fonts
_.each(require('../../../lib/embedded_fonts/configs'), function (o) {
  KNOWN_FONT_IDS[o.font.fontname] = o.id;
});



////////////////////////////////////////////////////////////////////////////////


//  {STORAGE_KEY}:
//    version:      (Number)  version of serilalizer
//
//    font_size:    (Number)  app font scale
//
//    sessions:     [Array]   session objects (currently only [0] used)
//
//      name:       (String)  session name (now only one, with name `$current$`)
//      fontname:   (String)  font name, defined by user
//      fonts:      [Array]   saved fonts data
//
//        {font_id}:
//          collapsed:  (Boolean) whenever font is collapsed or not
//          glyphs:     (Array)   list of modified and/or selected glyphs
//            - selected:   (Boolean) Whenever glyph is selected or not
//            - uid:        (String) Glyph unique id
//            - orig_code:  (Number) Glyph original (from the font source) code
//            - orig_css:   (Number) Glyph original (from the font source) css
//            - code:       (Number) User defined code
//            - css:        (String) User defined css name
//            - svg:        *RESERVED FOR FUTURE USE*


////////////////////////////////////////////////////////////////////////////////

// Localstore helpers

var store = {};

store.exists = function () {
  try {
    localStorage.setItem('__ls_test__','__ls_test__');
    localStorage.removeItem('__ls_test__');
    return true;

  } catch (e) {
    return false;
  }
};

store.set = function (key, value) {
  if (!store.exists()) { return; }
  if (value === undefined) { return localStorage.removeItem(key); }
  localStorage.setItem(key, JSON.stringify(value));
};

store.get = function (key) {
  if (!store.exists()) { return undefined; }
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch (e) {
    return undefined;
  }
};


////////////////////////////////////////////////////////////////////////////////


// Try to load session before everything (tweak priority)
//
N.wire.once('navigate.done', { priority: -10 }, function () {
  N.wire.emit('session_load');
});



N.wire.on('session_save', _.debounce(function () {

  if (!store.exists()) { return; }

  // Now always write to idx 0, until multisession support added
  // So, don't try to read previous data - overwrite always.

  var session = {};

  session.name = '$current$';
  session.fontname = N.app.fontName();
  session.css_prefix_text = N.app.cssPrefixText();
  session.css_use_suffix = N.app.cssUseSuffix();
  session.fonts = {};

  _.each(N.app.fontsList.fonts, function (font) {
    var font_data = { collapsed: font.collapsed(), glyphs: [] };

    _.each(font.glyphs, function (glyph) {
      if (glyph.isModified()) {
        font_data.glyphs.push({
          uid:        glyph.uid,
          selected:   glyph.selected(),
          orig_code:  glyph.originalCode,
          orig_css:   glyph.originalName,
          code:       glyph.code(),
          css:        glyph.name()
        });
      }
    });

    session.fonts[font.id] = font_data;
  });

  //
  // Save
  //
  store.set(STORAGE_KEY, {
    version:  SERIALIZER_VERSION,
    font_size: N.app.fontSize(),
    // now always write to idx 0, until multisession support added
    sessions: [session]
  });

}, 500));



N.wire.on('session_load', function () {
  var session, data;

  if (!store.exists()) { return; }

  // Extract everything from store, if possible
  data = store.get(STORAGE_KEY);

  if (_.isEmpty(data) || !_.isObject(data)) {
    data = { sessions: [] };
  }

  if (_.isNumber(data.font_size) && (data.font_size > 0)) {
    N.app.fontSize(data.font_size);
  }

  // Try to find current session
  session = _.find(data.sessions, function (session) {
    return '$current$' === session.name;
  });

  if (!session) { return; }

  //
  // Now load session data into models
  //

  N.app.fontName(session.fontname);

  if (_.has(session, 'css_prefix_text')) {
    N.app.cssPrefixText(String(session.css_prefix_text));
  } else {
    N.app.cssPrefixText('icon-'); // legacy fallback
  }

  if (_.has(session, 'css_use_suffix')) {
    N.app.cssUseSuffix(Boolean(session.css_use_suffix));
  } else {
    N.app.cssUseSuffix(false); // legacy fallback
  }

  var fonts = {};

  // remap session font lists into maps
  _.each(session.fonts || [], function (font, id) {
    var glyphs = {};

    _.each(font.glyphs, function (glyph) {
      glyphs[glyph.uid] = glyph;
    });

    font.glyphs = glyphs;
    fonts[id] = font;
  });

  _.each(N.app.fontsList.fonts, function (font) {
    var session_font = fonts[font.id] || { collapsed: false, glyphs: {} };

    // set collapsed state of font
    font.collapsed(!!session_font.collapsed);

    _.each(font.glyphs, function (glyph) {
      var session_glyph = session_font.glyphs[glyph.uid] || {};

      glyph.selected(!!session_glyph.selected);
      glyph.code(session_glyph.code || session_glyph.orig_code || glyph.originalCode);
      glyph.name(session_glyph.css || session_glyph.orig_css || glyph.originalName);
    });
  });
});
