/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


// prevent the event from bubbling to ancestor elements
function stopPropagation(event) {
  event.preventDefault();
  event.stopPropagation();
}


// nodeca.client.fontomas.ui.toolbar
module.exports = Backbone.View.extend({
  el: '#toolbar',


  $download_btn:  null,
  $glyphs_count:  null,


  initialize: function () {
    var self = this;

    // cache some inner elements
    this.$download_btn = this.$('#result-download');
    this.$glyphs_count = this.$('#selected-glyphs-count');

    // bind download button click event
    this.$download_btn.click(function (event) {
      event.preventDefault();
      self.trigger('click:download');
    });

    // initial setup
    this.setGlyphsCount(0);
  },


  setGlyphsCount: function (count) {
    this.$download_btn.toggleClass('disabled', !count);
    this.$download_btn[!count ? 'on' : 'off']('click', stopPropagation);

    this.$glyphs_count.text(+count);
  }
});
