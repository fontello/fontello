/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


module.exports = Backbone.View.extend({
  tagName:    "div",
  className:  "preview-glyph span3",


  render: function () {
    var font = this.model.get('font').getName(),
        uid  = this.model.get('source').uid,
        code = nodeca.shared.glyphs_map[font][uid];

    this.$el.html(nodeca.client.render('preview.glyph', {
      css:  'icon-' + this.model.get('css'),
      chr: nodeca.client.util.fixedFromCharCode(code)
    }));

    return this;
  }
});
