/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

function tranferEvents($a, $b, events) {
  $a.on(events.join(' '), $b.trigger);
}


module.exports = Backbone.View.extend({
  el: "#glyph-size",

  events: {
    "click [data-glyph-size]": "onChangeGlyphSize"
  },


  initialize: function () {
    _.bindAll(this);

    // render icon size buttons
    this.$el
      .html(nodeca.client.fontomas.render('icon-size', {
        buttons: nodeca.client.fontomas.config.preview_glyph_sizes
      }))
      .find("button:last")
        .addClass("active");
  },


  onChangeGlyphSize: function (event) {
    /*jshint bitwise:false*/
    event.preventDefault();
    this.trigger("change:glyph-size", ~~$(event.target).data('glyph-size'));
  }
});
