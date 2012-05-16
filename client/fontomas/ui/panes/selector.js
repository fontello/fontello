/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


module.exports = Backbone.View.extend({
  el:             '#selector',

  fonts:          null,
  glyph_size:     null,

  initialize: function (attributes) {
    this.fonts = new Backbone.Collection();
    this.changeGlyphSize(nodeca.config.fontomas.glyph_size.val);
  },


  changeGlyphSize: function (size) {
    this.$el.css('font-size', size);
  },


  addFont: function (font) {
    var view = new nodeca.client.fontomas.ui.panes.selector_font({model: font});

    view.on("toggleGlyph",        this.onToggleGlyph, this);
    view.on("remove",             this.removeFont,    this);

    $("#selector-fonts").append(view.render().el);
  },


  removeFont: function (font) {
    this.trigger('remove:font', font);
  },


  onToggleGlyph: function (data) {
    this.trigger('click:glyph', data);
  }
});
