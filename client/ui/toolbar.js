/*global window, N, jQuery, Handlebars, Backbone, $, _*/


"use strict";


// prevent the event from bubbling to ancestor elements
function stopPropagation(event) {
  event.preventDefault();
  event.stopPropagation();
}


module.exports = Backbone.View.extend({
  el: '#toolbar',


  $download_btn:  null,
  $glyphs_count:  null,
  keywords:       [],


  initialize: function () {
    var self = this, $glyph_size_value, $search, on_search_change;

    // cache some inner elements
    this.$download_btn = this.$('#result-download');
    this.$glyphs_count = this.$('#selected-glyphs-count');

    // initialize glyph-size slider
    $glyph_size_value = $('#glyph-size-value');
    $('#glyph-size-slider').slider({
      orientation:  'horizontal',
      range:        'min',
      value:        N.config.app.glyph_size.val,
      min:          N.config.app.glyph_size.min,
      max:          N.config.app.glyph_size.max,
      slide:        function (event, ui) {
        /*jshint bitwise:false*/
        var val = ~~ui.value;
        $glyph_size_value.text(val + 'px');
        self.trigger("change:glyph-size", val);
      }
    });

    // search query change event listener
    on_search_change = function (event) {
      self.trigger('change:search', $search.val());
    };

    // init search input
    $search = $('#search')
      .on('change', on_search_change)
      .on('keyup', _.debounce(on_search_change, 250))
      .on('focus keyup', _.debounce(function () {
        $search.typeahead('hide');
      }, 5000))
      .typeahead({
        source: this.keywords
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
  },

  addKeywords: function (tags) {
    _.each(tags, function (tag) {
      if (_.isString(tag) && !_.include(this.keywords, tag)) {
        this.keywords.push(tag);
      }
    }, this);
  }
});
