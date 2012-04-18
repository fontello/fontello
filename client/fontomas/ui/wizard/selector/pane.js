/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

module.exports = Backbone.View.extend({
  fonts:          null,
  glyph_size:     null,

  font_toolbar:   null,
  fontviews:      {},


  initialize: function (attributes) {
    _.bindAll(this);

    this.glyph_size   = _.last(nodeca.client.fontomas.config.preview_glyph_sizes);
    this.font_toolbar = new nodeca.client.fontomas.ui.wizard.selector.toolbar();

    this.font_toolbar.on("change:glyph-size", this.changeGlyphSize, this);

    this.fonts = new Backbone.Collection();
  },


  changeGlyphSize: function (size) {
    this.glyph_size = size;

    _.each(this.fontviews, function (view) {
      view.changeGlyphSize(size);
    });
  },


  addFont: function (font) {
    var view = new nodeca.client.fontomas.ui.wizard.selector.source_font({
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
