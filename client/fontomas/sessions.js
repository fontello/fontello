/*global window, nodeca, Handlebars, Backbone, $, _, store*/


"use strict";


var SERIALIZER_VERSION  = 2;
var STORAGE_KEY         = 'fontello:sessions';


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
//            - uid:        (String) Glyph unique id
//            - orig_code:  (Number) Glyph original (from the font source) code
//            - orig_css:   (Number) Glyph original (from the font source) css
//            - code:       (Number) User defined code
//            - css:        (String) User defined css name
//            - svg:        *RESERVED FOR FUTURE USE*


////////////////////////////////////////////////////////////////////////////////


var Session = Backbone.Model.extend({
  idAttribute: 'name',

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
    this.collection.fetch().remove(this).add(this).save();
    return this;
  },

  // Stub to prevent Backbone from reading or saving the model to the server.
  // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
  // if model doesn't have own `sync()` method.
  sync: function () {}
});


var SessionsCollection = Backbone.Collection.extend({
  model: Session,

  initialize: function () {
    this.fetch();

    // make sure "special" session exists
    if (0 === this.length) {
      this.create({name: '$current$', fontname: ''});
    }

    // get reference to current (default) session
    this.current = this.get('$current$');
  },

  fetch: function () {
    var data = store.get(STORAGE_KEY);

    this.version = data.version;
    this.reset(data.sessions);

    return this;
  },

  save: function () {
    store.set(STORAGE_KEY, {
      version:  2,
      sessions: this
    });

    return this;
  },

  // Stub to prevent Backbone from reading or saving the model to the server.
  // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
  // if model doesn't have own `sync()` method.
  sync: function () {}
});


module.exports = Backbone.Model.extend({
  initialize: function (attributes) {
    this.$fontname  = $(attributes.fontnameElement);
    this.fonts      = attributes.fontsList;
    this.sessions   = new SessionsCollection();

    this._disabled  = false;
  },

  enable: function () {
    this._disabled = false;
  },

  disable: function () {
    this._disabled = true;
  },

  load: function (name) {
    var session = !name ? this.sessions.current : this.sessions.get(name);

    this.disable();

    // seed models and ui elements
    this.$fontname.val(session.get('fontname'));
    session.seedInto(this.fonts);

    this.enable();
  },

  save: function (name) {
    var session;

    if (this._disabled) {
      return;
    }

    session = !name ? this.sessions.current
      : this.session.get(name) || this.sessions.create({name: name});

    session.set('fontname', this.$fontname.val());
    session.readFrom(this.fonts);

    session.save();
  },

  // Stub to prevent Backbone from reading or saving the model to the server.
  // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
  // if model doesn't have own `sync()` method.
  sync: function () {}
});
