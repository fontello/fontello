'use strict';


/*global window, underscore, $, ko, N, t*/


var _ = underscore;


var knownKeywords = _.chain(require('^/lib/embedded_fonts/configs'))
  // get list of keywords of all glyphs in the font,
  // flatten array, make sure all elementes are Strings,
  // and return an array with unique elements only
  .map(function (font) {
    return _.map(font.glyphs, function (glyph) {
      return glyph.search;
    });
  }).flatten().map(String).uniq().value();


////////////////////////////////////////////////////////////////////////////////


function ToolbarModel(fontsList, fontname) {
  var self = this;
  //
  // Essential properties
  //

  this.fontname = fontname;
  this.fontSize = ko.observable(N.runtime.config.glyph_size.val).extend({ throttle: 100 });

  // true, after download button pressed, until font buildeing finished
  this.building = ko.observable(false);

  //
  // Proxy to fontsList properties
  //

  this.selectedGlyphs = fontsList.selectedGlyphs;
  this.selectedCount  = fontsList.selectedCount;

  //
  // Notify application about font size changes
  //

  this.fontSize.subscribe(function (value) {
    N.emit('font_size_change', value);
  });

  //
  // Subscribe for build.started/finished events
  //

  N.on('build.started', function () {
    self.building(true);
  });

  N.on('build.finished', function () {
    self.building(false);
  });

}


////////////////////////////////////////////////////////////////////////////////


module.exports.init = function () {
  var fontname = ko.observable('');

  fontname.subscribe(function (value) {
    N.emit('session_save', { fontname: value });
  });

  N.on('session_load', function (session) {
    fontname(session.fontname || '');
  });


  N.once('fonts_ready', function (fontsList) {
    $(function () {
      var
      $view   = $('#toolbar'),
      toolbar = new ToolbarModel(fontsList, fontname);

      N.on('reset_all_confirm', function () {
        if (window.confirm(t('confirm_app_reset'))) {
          toolbar.fontname('');
          N.emit('reset_all');
        }
      });

      //
      // Initialize jquery fontSize slider
      //

      $view.find('#glyph-size-slider').slider({
        orientation:  'horizontal',
        range:        'min',
        value:        N.runtime.config.glyph_size.val,
        min:          N.runtime.config.glyph_size.min,
        max:          N.runtime.config.glyph_size.max,
        slide:        function (event, ui) {
          /*jshint bitwise:false*/
          toolbar.fontSize(~~ui.value);
        }
      });

      //
      // Initialize Twitter Bootstrap typeahead plugin
      //

      $view.find('#search')
        .on('keyup', function () {
          N.emit('filter_keyword', $.trim($(this).val()));
        })
        .on('focus keyup', _.debounce(function () {
          $(this).typeahead('hide');
        }, 5000))
        .typeahead({
          source: knownKeywords
        });

      //
      // Apply KO bindings
      //

      ko.applyBindings(toolbar, $view.get(0));

      //
      // Notify font_builder that we're ready
      //

      N.emit('toolbar_ready', toolbar);
    });
  });
};
