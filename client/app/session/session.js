// - Save/Load session
// - Autoload on start

'use strict';


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

  session.name            = '$current$';
  session.fontname        = N.app.fontName();
  session.css_prefix_text = N.app.cssPrefixText();
  session.css_use_suffix  = N.app.cssUseSuffix();
  session.hinting         = N.app.hinting();
  session.encoding        = N.app.encoding();
  session.font_fullname   = N.app.fontFullName();
  session.font_units      = N.app.fontUnitsPerEm();
  session.font_ascent     = N.app.fontAscent();
  session.font_copyright  = N.app.fontCopyright();
  session.fonts           = {};

  _.each(N.app.fontsList.fonts, function (font) {
    var font_data = { collapsed: font.collapsed(), glyphs: [] };

    // for custom icons we always have to store ALL
    // glyphs + their state
    if (font.fontname === 'custom_icons') {
      _.each(font.glyphs(), function (glyph) {
        font_data.glyphs.push({
          css:      glyph.name(),
          code:     glyph.code(),
          uid:      glyph.uid,
          selected: glyph.selected(),
          search:   glyph.search || [],
          svg: {
            path  : (glyph.svg || {}).path || '',
            width : (glyph.svg || {}).width || 0
          }
        });
      });
    } else {
      // for regular fonts store state of modified glyphs only
      _.each(font.glyphs(), function (glyph) {
        if (glyph.isModified()) {
          font_data.glyphs.push({
            uid:      glyph.uid,
            selected: glyph.selected(),
            code:     glyph.code(),
            css:      glyph.name()
          });
        }
      });
    }

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

  if (+data.font_size > 0) {
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

  N.app.fontsList.lock();

  N.app.fontName(session.fontname);

  if (_.has(session, 'css_prefix_text')) { N.app.cssPrefixText(String(session.css_prefix_text)); }
  if (_.has(session, 'css_use_suffix')) { N.app.cssUseSuffix(Boolean(session.css_use_suffix)); }
  if (_.has(session, 'encoding')) { N.app.encoding(String(session.encoding)); }
  if (_.has(session, 'font_units')) { N.app.fontUnitsPerEm(Number(session.font_units)); }
  if (_.has(session, 'font_ascent')) { N.app.fontAscent(Number(session.font_ascent)); }

  if (_.has(session, 'font_fullname')) {
    // patch broken data
    if (session.font_fullname === 'undefined') { delete session.font_fullname; }
    N.app.fontFullName(String(session.font_fullname || ''));
  }
  if (_.has(session, 'font_copyright')) {
    // patch broken data
    if (session.font_copyright === 'undefined') { delete session.font_copyright; }
    N.app.fontCopyright(String(session.font_copyright || ''));
  }

  N.app.hinting(session.hinting !== false);

  // reset selection prior to set glyph data
  // not nesessary now, since we load session only on start
  //_.each(N.app.fontsList.selectedGlyphs(), function (glyph) { glyph.selected(false); });

  // load glyphs states
  _.each(session.fonts, function (sessionFont, name) {
    var targetFont = N.app.fontsList.getFont(name);

    // Do nothing for unknown fonts
    if (!targetFont) { return; }

    targetFont.collapsed(!!sessionFont.collapsed);

    //
    // for custom icons - import glyphs & set their state
    //
    if (targetFont.fontname === 'custom_icons') {
      var charRefCode = 0xE800;

      targetFont.lock();

      _.each(sessionFont.glyphs, function (glyph) {
        // skip broken glyphs
        if (!glyph.code || !glyph.css || !glyph.svg ||
            (!glyph.svg || {}).path || (!glyph.svg || {}).width) {
          return;
        }

        targetFont.addGlyph({
          css:      glyph.css,
          code:     glyph.code,
          uid:      glyph.uid,
          selected: glyph.selected,
          search:   glyph.search || [],
          charRef:  charRefCode++,
          svg:      glyph.svg
        });
      });

      targetFont.unlock();
      return;
    }

    //
    // for existing fonts - set states only
    //

    // create map to lookup glyphs by id
    var lookup = {};
    _.each(targetFont.glyphs(), function (glyph) {
      lookup[glyph.uid] = glyph;
    });

    // fill glyphs state
    _.each(sessionFont.glyphs, function (glyph) {
      var targetGlyph = lookup[glyph.uid];

      // Check if glyph with this `uid` really exists
      if (!targetGlyph) { return; }

      targetGlyph.selected(!!glyph.selected);
      targetGlyph.code(glyph.code || targetGlyph.originalCode);
      targetGlyph.name(glyph.css || targetGlyph.originalName);
    });
  });

  N.app.fontsList.unlock();

});
