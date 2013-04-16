'use strict';


/*global ko*/


var _ = require('lodash');


////////////////////////////////////////////////////////////////////////////////


var knownKeywords = _(require('../../../lib/embedded_fonts/configs'))
  // get list of keywords of all glyphs in the font,
  // flatten array, make sure all elementes are Strings,
  // and return an array with unique elements only
  .map(function (font) {
    return _.map(font.glyphs, function (glyph) {
      return glyph.search;
    });
  })
  .flatten()
  .map(String)
  .uniq()
  .valueOf();


////////////////////////////////////////////////////////////////////////////////


function ToolbarModel() {
  var self = this;
  //
  // Essential properties
  //

  this.fontname = N.app.fontname;
  this.fontSize = N.app.fontSize;

  // true, after download button pressed, until font buildeing finished
  this.building = ko.observable(false);

  //
  // Proxy to fontsList properties
  //

  this.selectedGlyphs = N.app.fontsList.selectedGlyphs;
  this.selectedCount  = N.app.fontsList.selectedCount;

  //
  // Subscribe for build.started/finished events
  //

  N.wire.on('build.started', function () {
    self.building(true);
  });

  N.wire.on('build.finished', function () {
    self.building(false);
  });
}


////////////////////////////////////////////////////////////////////////////////


var fontname = ko.observable('');


fontname.subscribe(function (value) {
  N.wire.emit('session_save', { fontname: value });
});


N.wire.on('session_load', function (session) {
  fontname(session.fontname || '');
});


N.wire.once('navigate.done', function (fontsList) {
  var $view   = $('#toolbar')
    , toolbar = new ToolbarModel(fontsList, fontname);

  N.wire.on('reset_all_confirm', function () {
    if (window.confirm(t('confirm_app_reset'))) {
      toolbar.fontname('');
      N.wire.emit('reset_all');
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
      N.app.fontSize(Math.round(ui.value));
    }
  });

  //
  // Initialize Twitter Bootstrap typeahead plugin
  //

  $view.find('#search')
    .on('keyup', function () {
      N.wire.emit('cmd:search_update', $.trim($(this).val()));
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

  N.wire.emit('toolbar_ready', toolbar);
});
