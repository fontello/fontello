/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


module.exports = Backbone.View.extend({
  tagName:    "div",
  className:  "preview-glyph span3",


  render: function () {
    var code = this.model.get('source').code;

    this.$el.html(nodeca.client.render('preview.glyph', {
      css: 'icon-' + this.model.get('css'),
      fnt: 'font-embedded-' + this.model.get('font').get('id'),
      chr: nodeca.client.fontomas.util.fixedFromCharCode(code)
    }));

    return this;
  }
});
