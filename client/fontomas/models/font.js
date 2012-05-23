/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


module.exports = Backbone.Model.extend({
  defaults: function () {
    return {
      id        : null,
      font      : null,
      meta      : null,
      collapsed : false
    };
  },


  initialize: function (attributes) {
    this._glyphs = new (Backbone.Collection.extend({
      model: nodeca.client.fontomas.models.glyph
    }))();

    // remove glyphs data array
    this.unset('glyphs', {silent: true});

    // process each glyph data
    _.each(attributes.glyphs || [], this.addGlyph, this);
  },


  addGlyph: function (data) {
    return this._glyphs.create({
      source  : data,
      font    : this
    });
  },


  eachGlyph: function (iterator, thisArg) {
    this._glyphs.each(iterator, thisArg);
  },


  getGlyph: function (criteria) {
    var g;

    if (criteria.uid) {
      g = this._glyphs.get(criteria.uid);
    }

    if (!g && criteria.code) {
      g = this._glyphs.find(function (g) {
        return criteria.code === g.get('source').code;
      });
    }

    if (!g && criteria.css) {
      g = this._glyphs.find(function (g) {
        return criteria.css === g.get('source').css;
      });
    }

    return g;
  },


  // Stub to prevent Backbone from reading or saving the model to the server.
  // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
  // if model doesn't have own `sync()` method.
  sync: function sync() {}
});
