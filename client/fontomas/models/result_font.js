module.exports = Backbone.Model.extend({
  initialize: function () {
    this.glyphs = new nodeca.client.fontomas.models.glyphs_collection();
  },


  getGlyph: function (font_id, glyph_id) {
    return this.glyphs.find(function (glyph) {
      var src = glyph.get('source_glyph');
      return font_id === src.font_id && glyph_id === src.glyph_id;
    });
  },


  addGlyph: function (data) {
    var model = new nodeca.client.fontomas.models.glyph({source_glyph: data});
    this.trigger('add-glyph', model);
    this.glyphs.add(model);
  },


  removeGlyphsByFont: function (font_id) {
    // get array of matching glyphs and only then destroy every single one.
    // we can't destroy glyphs while iterating through `glyphs` collection:
    // as it' length will be changed and it will cause problems
    this.glyphs.chain().filter(function (glyph) {
      return font_id === glyph.get('source_glyph').font_id;
    }).each(function (glyph) {
      glyph.destroy();
    });
  },


  // Stub to prevent Backbone from reading or saving the model to the server.
  // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
  // if model doesn't have own `sync()` method.
  sync: function () {}
});
