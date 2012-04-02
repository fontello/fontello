/*global fontomas, _, Backbone*/

;(function () {
  "use strict";


  var config = fontomas.config;


  fontomas.models.result_font = Backbone.Model.extend({
    defaults: {
      glyph_count:  0
    },


    initialize: function () {
      this.glyphs = new fontomas.models.glyphs_collection;

      this.glyphs.on("add",     this.incCounter, this);
      this.glyphs.on("remove",  this.decCounter, this);
    },


    incCounter: function () {
      this.set("glyph_count", this.get("glyph_count") + 1);
    },


    decCounter: function () {
      this.set("glyph_count", this.get("glyph_count") - 1);
      fontomas.logger.assert(this.get("glyph_count") >= 0);
    },


    // Stub to prevent Backbone from reading or saving the model to the server.
    // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
    // if model doesn't have own `sync()` method.
    sync: function () {}
  });

}());
