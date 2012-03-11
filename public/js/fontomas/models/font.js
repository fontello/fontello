var Fontomas = (function (Backbone, Fontomas) {
  "use strict";


  Fontomas.models.Font = Backbone.Model.extend({
    defaults: function () {
      return {
        fontname:   "unknown",
        is_loaded:  false,
        is_ok:      false,
        is_added:   false
      };
    },

    // FIXME: the model isn't sync()ed to server yet
    sync: function () {
      console.log("models.Font.sync()");
    }
  });


  Fontomas.models.Font.collection = Backbone.Collection.extend({
    model: Fontomas.models.Font,

    parseId: function (pair_id) {
      var pair = pair_id.split("-");
      return {font_id: pair[0], glyph_id: pair[1]};
    },

    getFont: function (pair_id) {
      var font_id = this.parseId(pair_id).font_id;
      return this.get(font_id).get("font");
    },

    getGlyph: function (pair_id) {
      var glyph_id = this.parseId(pair_id).glyph_id;
      return this.getFont(pair_id).glyphs[glyph_id];
    }
  });


  return Fontomas;
}(window.Backbone, Fontomas || {}));
