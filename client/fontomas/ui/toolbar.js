/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


// prevent the event from bubbling to ancestor elements
function stopPropagation(event) {
  event.preventDefault();
  event.stopPropagation();
}


module.exports = Backbone.View.extend({
  el: '#toolbar',


  $glyphs_size:   null,
  $download_btn:  null,
  $glyphs_count:  null,


  initialize: function () {
    var self = this;

    // cache some inner elements
    this.$glyphs_size  = this.$('#glyph-size');
    this.$download_btn = this.$('#result-download');
    this.$glyphs_count = this.$('#selected-glyphs-count');

    // initialize glyph-size slider
    this.$glyphs_size.slider({
      orientation:  'horizontal',
      range:        'min',
      value:        nodeca.config.fontomas.glyph_size.min,
      min:          nodeca.config.fontomas.glyph_size.min,
      max:          nodeca.config.fontomas.glyph_size.max,
      animate:      true,
      slide:        function (event, ui) {
        /*jshint bitwise:false*/
        self.trigger("change:glyph-size", ~~ui.value);
      }
    });

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
