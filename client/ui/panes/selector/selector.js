/*global window, N, jQuery, Handlebars, Backbone, $, _*/


"use strict";


module.exports = Backbone.View.extend({
  el: '#selector',


  initialize: function (attributes) {
    this.changeGlyphSize(N.config.app.glyph_size.val);
    this.model.each(this.addFont, this);
  },


  changeGlyphSize: function (size) {
    this.$el.css('font-size', size);
  },


  addFont: function (font) {
    var view = new N.client.ui.panes.selector.font({model: font});
    this.$('#selector-fonts').append(view.render().el);
  }
});
