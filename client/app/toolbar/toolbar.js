'use strict';


/*global window, _, $, ko, N*/


var knownKeywords = _.chain(require('@/lib/embedded_fonts/configs'))
  // get list of keywords of all glyphs in the font,
  // flatten array, make sure all elementes are Strings,
  // and return an array with unique elements only
  .map(function (font) {
    return _.map(font.glyphs, function (glyph) {
      return glyph.search;
    });
  }).flatten().map(String).uniq().value();


////////////////////////////////////////////////////////////////////////////////


function ToolbarModel(fontsList, fontname, N) {
  var self = this;
  //
  // Essential properties
  //

  this.fontname = fontname;
  this.fontSize = ko.observable(N.config.app.glyph_size.val).extend({ throttle: 100 });

  // true, after download button pressed, until font buildeing finished
  this.building = ko.observable(false);

  //
  // Proxy to fontsList properties
  //

  this.selectedGlyphs = fontsList.selectedGlyphs;
  this.selectedCount  = fontsList.selectedCount;

  //
  // Handlers
  //

  this.importFile     = function () {
    N.emit('import.start');
  };

  this.resetAll       = function () {
    if (window.confirm(N.runtime.t('app.toolbar.confirm_app_reset'))) {
      this.fontname('');
      N.emit('reset_all');
    }
  }.bind(this);

  this.resetSelected  = function () {
    N.emit('reset_selected');
  };

  this.startDownload = require('./_downloader').bind(this);

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


module.exports.init = function (window, N) {
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
      toolbar = new ToolbarModel(fontsList, fontname, N);

      //
      // Initialize jquery fontSize slider
      //

      $view.find('#glyph-size-slider').slider({
        orientation:  'horizontal',
        range:        'min',
        value:        N.config.app.glyph_size.val,
        min:          N.config.app.glyph_size.min,
        max:          N.config.app.glyph_size.max,
        slide:        function (event, ui) {
          /*jshint bitwise:false*/
          toolbar.fontSize(~~ui.value);
        }
      });

      //
      // Initialize Twitter Bootstrap typeahead plugin
      //

      $view.find('#search')
        .on('keyup', function (event) {
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
    });
  });

  //
  // init tabs
  //

  require('./_tabs/tabs').init(window, N);
};
