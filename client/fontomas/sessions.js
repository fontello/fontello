/*global window, nodeca, Handlebars, Backbone, $, _, store*/


"use strict";


var SERIALIZER_VERSION  = 2;


// MIGRATIONS //////////////////////////////////////////////////////////////////


if (!store.disabled) {
  _.each([
    function () {
      var data = {version: 2, sessions: []}, collection, session;

      // get storage singleton
      collection = new (Backbone.Collection.extend({
        localStorage: new Backbone.LocalStorage("Fontello:Sessions"),
        model: Backbone.Model.extend({
          defaults: function () {
            return {name: 'Untitled', data: null};
          }
        }),
        initialize: function () { this.fetch(); }
      }));

      // we had only one session on version 1
      session = collection.at(0);

      // if it's a new user - he has no old crap
      if (session) {
        data.sessions.push({
          name:     session.get('name'),
          fontname: (session.get('data') || {}).name,
          fonts:    (session.get('data') || {}).fonts
        });

        // remove session
        session.destroy();

        store.set('fontello:sessions', data);
      }
    }
  ], function (migrate) { migrate(); });
}


// INTERNAL HELPERS ////////////////////////////////////////////////////////////


function read(self) {
  var data = store.get('fontello:sessions');

  self.version = data.version;
  self.reset(data.sessions);
}


function write(self) {
  store.set('fontello:sessions', {
    version:  2,
    sessions: self
  });
}


////////////////////////////////////////////////////////////////////////////////


//  "fontello:sessions":
//    version:      (Number)  version of serilalizer
//    sessions:
//      name:
//      fontname:
//      fonts:
//        {font_id}:
//          collapsed:  (Boolean) whenever font is collapsed or not
//          glyphs:     (Array)   list of modified and/or selected glyphs
//            - uid:        (String) Glyph unique id
//            - orig_code:  (Number) Glyph original (from the font source) code
//            - orig_css:   (Number) Glyph original (from the font source) css
//            - code:       (Number) User defined code
//            - css:        (String) User defined css name
//            - svg:        *RESERVED FOR FUTURE USE*


////////////////////////////////////////////////////////////////////////////////


var Session = Backbone.Model.extend({
  defaults: function () {
    return {
      name:     'Untitled',
      fontname: 'Untitled',
      fonts:    {}
    };
  },


  readFrom: function (fonts) {
    fonts.each(function (f) {
      var font_data = this.get('fonts')[f.get('id')] = {
        collapsed:  f.get('collapsed'),
        glyphs:     []
      };

      f.eachGlyph(function (g) {
        // save only selected and/or modified glyphs to
        // reduce amount of used space in the storage
        if (g.get('selected') || g.isModified()) {
          font_data.glyphs.push({
            uid:        g.get('uid'),
            orig_code:  g.get('source').code,
            orig_css:   g.get('source').css,
            selected:   g.get('selected'),
            code:       g.get('code'),
            css:        g.get('css')
          });
        }
      });
    }, this);
  },


  seedInto: function (fonts) {
    fonts.each(function (font) {
      var font_data = this.get('fonts')[font.get('id')] || {};

      // reset glyphs
      font.eachGlyph(function (glyph) {
        glyph.set({
          selected: false,
          code:     null,
          css:      null
        }, {silent: true});
      });

      // update modified glyphs
      _.each(font_data.glyphs, function (glyph_data) {
        var glyph = font.getGlyph({
          uid:  glyph_data.uid,
          code: glyph_data.orig_code,
          css:  glyph_data.orig_css
        });

        if (glyph) {
          glyph.set({
            selected: glyph_data.selected,
            code:     glyph_data.code,
            css:      glyph_data.css,
          });
        }
      });
    }, this);
  },


  save: function () {
    write(this.collection);
    return this;
  },

  // Stub to prevent Backbone from reading or saving the model to the server.
  // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
  // if model doesn't have own `sync()` method.
  sync: function () {}
});


var SessionCollection = Backbone.Collection.extend({
  model: Session,

  initialize: function () {
    read(this);

    // make sure "special" session exists
    if (0 === this.length) {
      this.create({name: '$current$', fontname: ''});
    }
  },

  // Stub to prevent Backbone from reading or saving the model to the server.
  // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
  // if model doesn't have own `sync()` method.
  sync: function () {}
});


// Singleton
module.exports = new SessionCollection();
