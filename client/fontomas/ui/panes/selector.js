/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


module.exports = Backbone.View.extend({
  fonts:          null,
  glyph_size:     null,

  fontviews:      {},


  initialize: function (attributes) {
    this.glyph_size = nodeca.config.fontomas.glyph_size.val;
    this.fonts      = new Backbone.Collection();
  },


  changeGlyphSize: function (size) {
    this.glyph_size = size;

    _.each(this.fontviews, function (view) {
      view.changeGlyphSize(size);
    });
  },


  addFont: function (font) {
    var view = new nodeca.client.fontomas.ui.panes.selector_font({
      model:      font,
      glyph_size: this.glyph_size
    });

    view.on("toggleGlyph",        this.onToggleGlyph, this);
    view.on("remove",             this.removeFont,    this);

    this.fontviews[font.id] = view;
    $("#selector-fonts").append(view.render().el);
  },


  removeFont: function (font) {
    delete this.fontviews[font.id];
    this.trigger('remove:font', font);
  },


  onToggleGlyph: function (data) {
    this.trigger('click:glyph', data);
  }
});
