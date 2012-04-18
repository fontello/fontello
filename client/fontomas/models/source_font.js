/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

module.exports = Backbone.Model.extend({
  defaults: function () {
    return {
      font:   {fontname: "unknown"},
      glyphs: [],
    };
  },


  getGlyph: function (glyph_id) {
    return this.get("glyphs")[glyph_id];
  },


  // Stub to prevent Backbone from reading or saving the model to the server.
  // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
  // if model doesn't have own `sync()` method.
  sync: function () {}
});
