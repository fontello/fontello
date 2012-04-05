/*global fontomas, _, Backbone*/

;(function () {
  "use strict";


  fontomas.models.result_font = Backbone.Model.extend({
    defaults: {
      glyphs_count: 0
    },


    initialize: function () {
      this.glyphs = new fontomas.models.glyphs_collection();

      this.glyphs.on('add remove', function () {
        this.set('glyphs_count', this.glyphs.length);
      }, this);
    },


    getGlyph: function (font_id, glyph_id) {
      return this.glyphs.find(function (glyph) {
        var src = glyph.get('source_glyph');
        return font_id === src.font_id && glyph_id === src.glyph_id;
      });
    },


    addGlyph: function (data) {
      var model = new fontomas.models.glyph({source_glyph: data});
      this.trigger('add-glyph', model);
      this.glyphs.add(model);
    },


    removeGlyphsByFont: function (font_id) {
      var glyphs = this.glyphs.filter(function (glyph) {
        return font_id === glyph.get('source_glyph').font_id;
      });

      this.glyphs.remove(glyphs);
    },


    // Stub to prevent Backbone from reading or saving the model to the server.
    // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
    // if model doesn't have own `sync()` method.
    sync: function () {}
  });

}());
