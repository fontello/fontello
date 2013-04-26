'use strict';


var _  = require('lodash');
var ko = require('knockout');


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
  //
  // Essential properties
  //

  this.fontSize = ko.observable(N.app.fontSize());

  this.fontSize.subscribe(_.debounce(function (value) {
    N.app.fontSize(value);
    N.wire.emit('session_save');
  }, 500));


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
  this.cssPrefixText  = N.app.cssPrefixText;
  this.cssUseSuffix   = N.app.cssUseSuffix;

  this.fontName.subscribe(function (value) {
    var cleared = String(value).toLowerCase().replace(/[^a-z0-9_\-]/g, '');
    if (cleared !== value) { N.app.fontName(cleared); }
  });
}


////////////////////////////////////////////////////////////////////////////////


N.wire.once('navigate.done', function (data) {
  var $view   = $('#toolbar')
    , toolbar = new ToolbarModel();


  //
  // Subscribe for build.started/finished events
  //

  N.wire.on('build.started', function () {
    toolbar.building(true);
  });

  N.wire.on('build.finished', function () {
    toolbar.building(false);
  });

  //
  // Initialize jquery fontSize slider
  //

  toolbar.fontSize(N.app.fontSize()); // Sync with global, to track first session load
  $('#glyph-size-slider').slider({
    orientation:  'horizontal',
    range:        'min',
    value:        toolbar.fontSize(),//N.runtime.config.glyph_size.val,
    min:          N.runtime.config.glyph_size.min,
    max:          N.runtime.config.glyph_size.max,
    slide:        function (event, ui) {
      toolbar.fontSize(Math.round(ui.value));
    }
  });

  //
  // Initialize Twitter Bootstrap typeahead plugin
  //

  $('#search')
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
