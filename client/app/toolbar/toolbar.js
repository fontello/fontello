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

  //
  // Essential properties
  //

  this.fontname = fontname;
  this.fontSize = ko.observable(N.config.app.glyph_size.val).extend({ throttle: 100 });

  //
  // Proxy to fontsList properties
  //

  this.selectedGlyphs = fontsList.selectedGlyphs;
  this.selectedCount  = fontsList.selectedCount;

  //
  // Handlers
  //

  this.resetAll       = function () {
    if (window.confirm(N.runtime.t('confirm.app_reset'))) {
      this.fontname('');
      N.emit('reset_all');
    }
  }.bind(this);

  this.resetSelected  = function () {
    N.emit('reset_selected');
  };

  this.importFile     = require('./_import_file').bind(this);
  this.startDownload  = require('./_start_download').bind(this);

  //
  // Notify application about font size changes
  //

  this.fontSize.subscribe(function (value) {
    N.emit('font_size_change', value);
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (window, N) {
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
      // Trigger change of hidden file input
      //

      toolbar.chooseFile = function (model, event) {
        event.preventDefault();

        if (!window.FileReader) {
          N.emit('notification', 'error', N.runtime.t('errors.no_file_reader'));
          return false;
        }

        $view.find('#import-file').click();
        return false;
      };

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
};
