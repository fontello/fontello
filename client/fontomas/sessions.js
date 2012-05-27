/*global window, nodeca, Handlebars, Backbone, $, _, store*/


"use strict";


var SERIALIZER_VERSION  = 2;
var STORAGE_KEY         = 'fontello:sessions';
var MIGRATIONS          = [];


// MIGRATIONS //////////////////////////////////////////////////////////////////


//
// Migrate from v1 (Backbone.localStorage based) to v2
//


MIGRATIONS.push(function () {
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
});


//
// Run migrations ONLY if there's no new version of session storage found
//


if (SERIALIZER_VERSION !== (store.get(STORAGE_KEY) || {}).version) {
  _.each(MIGRATIONS, function (migrate) { migrate(); });
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
      name:     null,
      fontname: null,
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
        var is_selected = g.get('selected'),
            is_modified = g.isModified();

        // save only selected and/or modified glyphs to
        // reduce amount of used space in the storage
        if (is_selected || is_modified) {
          var data = {
            uid:        g.get('uid'),
            orig_code:  g.get('source').code,
            orig_css:   g.get('source').css
          };

          // dramatically reduce amount of stored data by
          // storing really changed values ONLY.

          if (is_selected) {
            data.selected = g.get('selected');
          }

          if (is_modified && g.get('code') !== data.orig_code) {
            data.code = g.get('code');
          }

          if (is_modified && g.get('css') !== data.orig_css) {
            data.css = g.get('css');
          }

          font_data.glyphs.push(data);
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
    var data = store.get(STORAGE_KEY) || {sessions: []};

    this.reset(data.sessions);

    return this;
  },

  save: function () {
    store.set(STORAGE_KEY, {
      version:  SERIALIZER_VERSION,
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

    if (!session) {
      // this should never happen!!! and can happen ONLY if somebody
      // will remove named session
      nodeca.logger.error("Cannot load session named '" + name +"'.");
      session = this.sessions.current;
    }

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
