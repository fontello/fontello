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


  $glyphs_size:   null,
  $download_btn:  null,
  $glyphs_count:  null,


  initialize: function () {
    var self = this;

    // cache some inner elements
    this.$glyphs_size  = this.$('#glyph-size');
    this.$download_btn = this.$('#result-download');
    this.$glyphs_count = this.$('#selected-glyphs-count');

    // initialize glyph-size buttons
    // FIXME: should be donw in application layout directly
    this.$glyphs_size.html(nodeca.client.fontomas.render('icon-size', {
      buttons: nodeca.client.fontomas.config.preview_glyph_sizes
    })).find("button:last").addClass("active");

    // bind download button click event
    this.$download_btn.click(function (event) {
      event.preventDefault();
      self.trigger('click:download');
    });

    // bind glyph size button click events
    this.$glyphs_size.find('[data-glyph-size]').click(function (event) {
      /*jshint bitwise:false*/
      event.preventDefault();
      self.trigger("change:glyph-size", ~~$(event.target).data('glyph-size'));
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
