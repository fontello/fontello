'use strict';


var Bloodhound = require('typeahead.js/dist/bloodhound.js');
var _  = require('lodash');
var ko = require('knockout');

var savedConfig = null;


var GLYPH_SIZE_MIN = 12;
var GLYPH_SIZE_MAX = 30;


////////////////////////////////////////////////////////////////////////////////


var knownKeywords = _(require('../../../../lib/embedded_fonts/client_config'))
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
  .sort()
  .valueOf();


////////////////////////////////////////////////////////////////////////////////


function ToolbarModel() {
  //
  // Essential properties
  //

  this.fontSize = ko.observable(N.app.fontSize());
  this.fontSizeMin = GLYPH_SIZE_MIN;
  this.fontSizeMax = GLYPH_SIZE_MAX;

  this.fontSize.subscribe(_.debounce(function (value) {
    if (value < GLYPH_SIZE_MIN) { return; }

    N.app.fontSize(value);
    N.wire.emit('session_save');
  }, 50));


  // true, after download button pressed, until font buildeing finished
  this.building = ko.observable(false);
  // true while saving session
  this.saving   = ko.observable(false);

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
  this.hinting        = N.app.hinting;
  this.apiMode        = N.app.apiMode;
  this.apiUrl         = N.app.apiUrl;
  this.getConfig      = N.app.getConfig;

  this.fontName.subscribe(function (value) {
    var cleared = String(value).toLowerCase().replace(/[^a-z0-9_\-]/g, '');
    if (cleared !== value) { N.app.fontName(cleared); }
  });
}


////////////////////////////////////////////////////////////////////////////////


N.wire.once('navigate.done', function (data) {
  var $view   = $('#toolbar'),
      toolbar = new ToolbarModel();


  // Save user session (loaded via API) back to database
  function save() {
    if (!N.app.apiSessionId) { return Promise.resolve(); }

    // Skip first  save attempt (it happens on app init)
    if (!savedConfig) {
      savedConfig = N.app.getConfig();
      return Promise.resolve();
    }

    toolbar.saving(true);
    return N.app.serverSave()
      .then(() => {
        toolbar.saving(false);
      })
      .catch(err => {
        toolbar.saving(false);
        throw err;
      });
  }

  //
  // Autosave session to server in API mode
  //
  N.wire.on('session_save',  _.debounce(function () {
    save().catch(err => N.wire.emit('error', err));
  }, 3000));

  //
  // Save on button press
  //
  N.wire.on('api.update', function api_save() {
    return save();
  });

  //
  // Export on button press (save & go to pingback url)
  //
  N.wire.on('api.export',  function api_export() {
    return save().then(() => {
      window.location = N.app.apiUrl();
    });
  });

  //
  // build font on button press
  //
  N.wire.on('build_font', function build_font() {
    // That should not happen, but check for safety
    if (!N.app.fontsList.selectedCount()) {
      return;
    }

    var config = N.app.getConfig();

    N.logger.debug('About to build font', config);

    toolbar.building(true);

    let rpc_params = {
      config: new Blob([ JSON.stringify(config) ], { type: 'application/json' })
    };

    return N.io.rpc('fontello.font.generate', rpc_params).then(res => {
      toolbar.building(false);

      // inject download url via iframe to start download
      var id = res.id;  // generated file id
      var url = N.router.linkTo('fontello.font.download', { id });
      $('iframe#' + id).remove();
      $('<iframe></iframe>')
        .attr({ id, src: url })
        .css('display', 'none')
        .appendTo(window.document.body);
    });
  });


  //
  // Initialize jquery fontSize slider
  //


  //
  // Initialize Twitter Bootstrap typeahead plugin
  //

  // constructs the suggestion engine
  var keywords = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    // `states` is an array of state names defined in "The Basics"
    local: $.map(knownKeywords, function (keyword) { return { value: keyword }; })
  });
  keywords.initialize();

  $('#search')
    .on('change input keyup typeahead:selected', function () {
      N.app.searchWord($.trim($(this).val()));
    })
    .on('keyup', function (e) {
      // Clear content on escape
      if (e.keyCode === 27) {
        $(this).val('');
        N.app.searchWord('');
      }
    })
    .typeahead({
      hint: true,
      highlight: true,
      minLength: 1
    }, {
      name: 'keywords',
      displayKey: 'value',
      // `ttAdapter` wraps the suggestion engine in an adapter that
      // is compatible with the typeahead jQuery plugin
      source: keywords.ttAdapter()
    })
    .focus();

  //
  // Apply KO bindings
  //

  ko.applyBindings(toolbar, $view.get(0));

  //
  // Setup initial search string.
  //
  $.fn.setCursorPosition = function (pos) {
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
