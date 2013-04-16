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

  this.fontSize = ko.observable(N.app.fontSize());

  // true, after download button pressed, until font buildeing finished
  this.building = ko.observable(false);

  //
  // Proxy to global properties
  //

  this.selectedGlyphs = N.app.fontsList.selectedGlyphs;
  this.selectedCount  = N.app.fontsList.selectedCount;
  this.searchWord     = N.app.searchWord;
  this.searchMode     = N.app.searchMode;
  this.fontName       = N.app.fontName;

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


N.wire.once('navigate.done', function (data) {
  var $view   = $('#toolbar')
    , toolbar = new ToolbarModel();

  // Debounced updater of global font size
  var updateAppFontSize = _.debounce(function () {
    N.app.fontSize(toolbar.fontSize());
  }, 500);

  //
  // Initialize jquery fontSize slider
  //

  $view.find('#glyph-size-slider').slider({
    orientation:  'horizontal',
    range:        'min',
    value:        toolbar.fontSize(),//N.runtime.config.glyph_size.val,
    min:          N.runtime.config.glyph_size.min,
    max:          N.runtime.config.glyph_size.max,
    slide:        function (event, ui) {
      toolbar.fontSize(Math.round(ui.value));
      updateAppFontSize();
    }
  });

  //
  // Initialize Twitter Bootstrap typeahead plugin
  //

  $view.find('#search')
    .on('keyup', function (e) {
      // Clear content on escape
      if (e.keyCode === 27) {
        $(this).val('');
      }
      N.app.searchWord($.trim($(this).val()));
    })
    .on('focus keyup', _.debounce(function () {
      $(this).typeahead('hide');
    }, 3000))
    .typeahead({
      source: knownKeywords
    })
    .focus();

  //
  // Apply KO bindings
  //

  ko.applyBindings(toolbar, $view.get(0));

  //
  // Setup initial search string.
  //
  $.fn.setCursorPosition = function(pos) {
    if ($(this).get(0).setSelectionRange) {
      $(this).get(0).setSelectionRange(pos, pos);
    } else if ($(this).get(0).createTextRange) {
      var range = $(this).get(0).createTextRange();
      range.collapse(true);
      range.moveEnd('character', pos);
      range.moveStart('character', pos);
      range.select();
    }
  };

  var txt;

  if (data.params && data.params.search) {
    txt = data.params.search;
    $view.find('#search')
      .val(txt)
      .setCursorPosition(txt.length);
    N.app.searchWord(txt);
  }

});
