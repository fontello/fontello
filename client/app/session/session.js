/*global store*/


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


// Try to load session before everything (tweak priority)
//
N.wire.once('navigate.done', { priority: -10 }, function () {
  N.wire.emit('session_load');
});



N.wire.on('session_save', _.debounce(function () {
  var storage = Object(store.get(STORAGE_KEY))
    , session = Object(_.find(storage.sessions || [], function (session) {
        return '$current$' === session.name;
      }));

  //
  // Fill session data
  //
  session.name = '$current$';
  session.fontname = N.app.fontName();
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



N.wire.on('session_load', function (s) {
  var data, session;

  if (s) {
    session = s;
  } else {
    // Extract everything from store, if possible
    data = store.get(STORAGE_KEY) || { sessions: [] };

    if (_.isNumber(data.font_size) && (data.font_size > 0)) {
      N.app.fontSize(data.font_size);
    }

    // Try to find current session
    session = _.find(data.sessions, function (session) {
      return '$current$' === session.name;
    });

    if (!session) {
      return;
    }
  }

  //
  // Now load session data into models
  //

  N.app.fontName(session.fontname);

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
