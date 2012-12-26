/*global window, $, store, N*/


"use strict";


var _ = N.runtime.underscore;


var SERIALIZER_VERSION  = 3;
var STORAGE_KEY         = 'fontello:sessions';
var KNOWN_FONT_IDS      = {};


// Fill in known fonts
_.each(require('^/lib/embedded_fonts/configs'), function (o) {
  KNOWN_FONT_IDS[o.font.fontname] = o.id;
});


// MIGRATIONS //////////////////////////////////////////////////////////////////


function migrate() {
  //
  // Run migrations ONLY if there's no new version of session storage found
  //

  if (SERIALIZER_VERSION === (store.get(STORAGE_KEY) || {}).version) {
    return;
  }

  //
  // Migrate from v1 (Backbone.localStorage based) to v2
  //

  (function () {
    var data, ids;

    if (!window.localStorage || store.disabled) {
      // Backbone.localStorage used LocalStorage directly, so we will
      // need to "access" it directly as well to get the list of models
      return;
    }

    /*global localStorage*/

    data  = {version: 2, sessions: []};
    ids   = localStorage.getItem('Fontello:Sessions');

    // found old session
    if (/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/.test(ids)) {
      store.remove('Fontello:Sessions');
      _.each(ids.split(','), function (id) {
        var session;

        id = 'Fontello:Sessions-' + id;

        session = JSON.parse(localStorage.getItem(id));

        if (session && '$current$' === session.name) {
          data.sessions.push({
            name:     '$current$',
            fontname: (session.data || {}).name,
            fonts:    (session.data || {}).fonts
          });
        }

        store.remove(id);
      });
    }

    // we need to migrate ONLY if there's no new storage
    if (!store.get('fontello:sessions')) {
      store.set('fontello:sessions', data);
    }
  })();

  //
  // Migrate from v2 to v3
  //

  (function () {
    var data = store.get('fontello:sessions');

    // migrate ONLY if user is using old version
    if (2 === data.version) {
      data.version = 3;

      _.each(data.sessions, function (session) {
        _.each(session.fonts, function (font) {
          _.each(font.glyphs, function (glyph) {
            glyph.css   = glyph.css || glyph.orig_css;
            glyph.code  = glyph.code || glyph.orig_code;
          });
        });
      });

      store.set('fontello:sessions', data);
    }
  })();
}


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


module.exports.init = function () {
  migrate();

  N.once('fonts_ready', function () {
    var
    data    = store.get(STORAGE_KEY) || {sessions: []},
    session = _.find(data.sessions, function (session) {
      return '$current$' === session.name;
    });

    if (session) {
      N.emit('session_load', session);
    }
  });


  N.on('session_save', function (data) {
    var
    storage = Object(store.get(STORAGE_KEY)),
    session = Object(_.find(storage.sessions || [], function (session) {
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


  N.on('import.done', function (file) {
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
        selected:   true,
        uid:        g.uid,
        css:        g.css,
        code:       g.code,
        orig_css:   g.orig_css,
        orig_code:  g.orig_code
      });
    });

    N.emit('session_load', session);
  });
};
