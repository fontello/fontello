// - Save/Load session
// - Autoload on start

"use strict";


var _ = require('lodash');


var STORAGE_KEY        = 'fontello:sessions:v4';


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

store.exists = _.memoize(function () {
  try {
    localStorage.setItem('__ls_test__','__ls_test__');
    localStorage.removeItem('__ls_test__');
    return true;

  } catch (e) {
    return false;
  }
});

store.remove = function (key) {
  if (!store.exists()) { return; }
  localStorage.removeItem(key);
};

store.set = function (key, value) {
  if (!store.exists()) { return; }
  if (value === undefined) { return store.remove(key); }
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

    session.fonts[font.fontname] = font_data;
  });

  //
  // Save
  //
  store.set(STORAGE_KEY, {
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

  // reset selection prior to set glyph data
  // not nesessary now, since we load session only on start
  _.each(N.app.fontsList.selectedGlyphs(), function (glyph) { glyph.selected(false); });

  // load glyphs states
  _.each(session.fonts, function (sessionFont, name) {
    var targetFont = N.app.fontsList.fontsByName[name];

    if (!targetFont) { return; }

    targetFont.collapsed(!!sessionFont.collapsed);

    // create map to lookup glyphs by id
    var lookup = {};
    _.each(targetFont.glyphs, function (glyph) {
      lookup[glyph.uid] = glyph;
    });

    // fill glyphs state
    _.each(sessionFont.glyphs, function (glyph) {

      var targetGlyph = lookup[glyph.uid];

      targetGlyph.selected(!!glyph.selected);
      targetGlyph.code(glyph.code || glyph.orig_code || targetGlyph.originalCode);
      targetGlyph.name(glyph.css || glyph.orig_css || targetGlyph.originalName);
    });
  });
});


////////////////////////////////////////////////////////////////////////////////

// Upgrade session format v3 -> v4

function migrate () {

  var OLD_STORAGE_KEY = 'fontello:sessions';
  var NEW_STORAGE_KEY = 'fontello:sessions:v4';

  try {
    var oldStore = store.get(OLD_STORAGE_KEY);

    // Check if have any data
    if (!oldStore || !_.isObject(oldStore)) { return; }

    if (oldStore.version !== 3) { return store.remove(OLD_STORAGE_KEY); }

    var oldSession = oldStore.sessions[0];

    if (!_.isObject(oldSession)) { return store.remove(OLD_STORAGE_KEY); }

    var newStore = {
      font_size : oldStore.font_size || 16,
      sessions  : [{
        name : "$current$",
        fontname : oldSession.fontname || '',
        css_prefix_text: oldSession.css_prefix_text || 'icon-',
        css_use_suffix: (oldSession.css_use_suffix === true),
        fonts : {}
      }]
    };

    var newSession = newStore.sessions[0];

    // create map to lookup glyphs by id
    var glyphById = {};
    _.each(N.app.fontsList.fonts, function (font) {
      _.each(font.glyphs, function (glyph) {
        glyphById[glyph.uid] = glyph;
      });
    });

    _.each(oldSession.fonts, function (font) {
      _.each(font.glyphs, function (glyph) {
        var fontname = glyphById[glyph.uid].font.fontname;

        if (!newSession.fonts[fontname]) {
          newSession.fonts[fontname] = { collapsed: false, glyphs: [] };
        }

        newSession.fonts[fontname].glyphs.push(glyph);
      });
    });

    store.set(NEW_STORAGE_KEY, newStore);

  } catch (e) {}

  // kill old data - not needed anymore
  store.remove(OLD_STORAGE_KEY);
}


// Try to load session before everything (tweak priority)
//
N.wire.once('navigate.done', { priority: -10 }, function () {
  migrate ();
  N.wire.emit('session_load');
});
