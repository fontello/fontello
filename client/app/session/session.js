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
//    sessions:
//      name:
//      fontname:
//      fonts:
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


N.wire.once('fonts_ready', function () {
  var data    = store.get(STORAGE_KEY) || { sessions: [] }
    , session = _.find(data.sessions, function (session) {
        return '$current$' === session.name;
      });

  if (session) {
    N.wire.emit('session_load', session);
  }
});


N.wire.on('session_save', function (data) {
  var storage = Object(store.get(STORAGE_KEY))
    , session = Object(_.find(storage.sessions || [], function (session) {
        return '$current$' === session.name;
      }));

  _.extend(session, _.pick(Object(data), 'fontname', 'fonts'), {
    name: '$current$'
  });

  store.set(STORAGE_KEY, {
    version:  SERIALIZER_VERSION,
    sessions: [session]
  });
});


N.wire.on('import.done', function (file) {
  var config, session;

  if ('application/json' !== file.type || !_.isObject(file.data)) {
    return;
  }

  config  = file.data;
  session = { fontname: config.name, fonts: {} };

  _.each(config.glyphs, function (g) {
    var id = KNOWN_FONT_IDS[g.src];

    if (!session.fonts[id]) {
      session.fonts[id] = { collapsed: false, glyphs: [] };
    }

    session.fonts[id].glyphs.push({
      selected:  true,
      uid:       g.uid,
      css:       g.css,
      code:      g.code,
      orig_css:  g.orig_css,
      orig_code: g.orig_code
    });
  });

  N.wire.emit('session_load', session);
});


N.wire.on('session_load', function (session) {
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
