module.exports = Backbone.View.extend({
  el: '#preview',

  initialize: function () {
    this.$glyphs = this.$('#preview-font');

    this.model.glyphs.on('add', this.addGlyph, this);
  },


  /**
    *  ui.wizard.preview.pane#addGlyph(glyph) -> Void
    *
    *  Creates corresponding view for given glyph.
    *
    *  ##### See Also:
    *
    *  - [[ui.wizard.preview.glyph]]
    */
  addGlyph: function (glyph) {
    var view = new nodeca.client.fontomas.ui.wizard.preview.glyph({model: glyph});
    this.$glyphs.append(view.el);
  }
});
