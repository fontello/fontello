/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";


module.exports = Backbone.View.extend({
  // Use existing DOM element instead of generating a new one.
  el: '#codes-editor',


  initialize: function () {
    this.$glyphs = this.$('#result-font');

    this.model.glyphs.on('add', this.addGlyph, this);
  },


  addGlyph: function (glyph) {
    var view = new nodeca.client.fontomas.ui.panes.codes_editor_glyph({model: glyph});
    this.$glyphs.append(view.el);
  }
});
