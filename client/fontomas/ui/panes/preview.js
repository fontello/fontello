/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

module.exports = Backbone.View.extend({
  el: '#preview',

  initialize: function () {
    this.$glyphs = this.$('#preview-font');

    this.model.glyphs.on('add', this.addGlyph, this);
  },


  addGlyph: function (glyph) {
    var view = new nodeca.client.fontomas.ui.panes.preview_glyph({model: glyph});
    this.$glyphs.append(view.el);
  }
});
