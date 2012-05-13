/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";


module.exports = Backbone.View.extend({
  // Use existing DOM element instead of generating a new one.
  el: '#editor',


  /**
    *  new ui.wizard.result.pane()
    *
    *  View constructor.
    */
  initialize: function () {
    this.$glyphs = this.$('#result-font');

    this.model.glyphs.on('add', this.addGlyph, this);
  },


  /**
    *  ui.wizard.result.pane#addGlyph(glyph) -> Void
    *
    *  Creates corresponding view for given glyph.
    *
    *  ##### See Also:
    *
    *  - [[ui.wizard.result.glyph]]
    */
  addGlyph: function (glyph) {
    var view = new nodeca.client.fontomas.ui.wizard.result.glyph({model: glyph});
    this.$glyphs.append(view.el);
  }
});
