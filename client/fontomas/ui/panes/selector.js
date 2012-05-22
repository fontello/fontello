/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


module.exports = Backbone.View.extend({
  el: '#selector',


  initialize: function (attributes) {
    this.changeGlyphSize(nodeca.config.fontomas.glyph_size.val);
    this.model.each(this.addFont, this);
  },


  changeGlyphSize: function (size) {
    this.$el.css('font-size', size);
  },


  addFont: function (font) {
    var view = new nodeca.client.fontomas.ui.panes.selector_font({model: font});
    this.$('#selector-fonts').append(view.render().el);
  }
});
