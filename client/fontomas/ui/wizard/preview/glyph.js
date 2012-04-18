/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

module.exports = Backbone.View.extend({
  tagName:    "div",
  className:  "preview-glyph span2",


  initialize: function () {
    _.bindAll(this);

    this.model.on("change",  this.render, this);
    this.model.on("destroy", this.remove, this);

    this.render();
  },


  render: function () {
    var src = this.model.get('source_glyph');

    this.$el.html(nodeca.client.fontomas.render('preview:glyph', {
      css: 'icon-' + src.css,
      fnt: 'font-embedded-' + src.embedded_id,
      chr: nodeca.client.fontomas.util.fixedFromCharCode(src.code)
    }));

    return this;
  },


  remove: function () {
    this.$el.remove();
    this.trigger("remove", this);
  }
});
