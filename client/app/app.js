'use strict';


var _  = require('lodash');
var ko = require('knockout');


var embedded_fonts    = require('../../lib/embedded_fonts/client_config')
  , trackNameChanges  = require('./_namesTracker')
  , trackCodeChanges  = require('./_codesTracker');


var DEFAULT_GLYPH_SIZE = 16;


// Int to char, with fix for big numbers
// see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/fromCharCode
//
function fixedFromCharCode(code) {
  /*jshint bitwise: false*/
  if (code > 0xffff) {
    code -= 0x10000;

    var surrogate1 = 0xd800 + (code >> 10)
      , surrogate2 = 0xdc00 + (code & 0x3ff);

    return String.fromCharCode(surrogate1, surrogate2);
  } else {
    return String.fromCharCode(code);
  }
}


// Char to Int, with fix for big numbers
//
function fixedCharCodeAt(chr) {
  /*jshint bitwise: false*/
  var char1 = chr.charCodeAt(0)
    , char2 = chr.charCodeAt(1);

  if ((chr.length >= 2) &&
      ((char1 & 0xfc00) === 0xd800) &&
      ((char2 & 0xfc00) === 0xdc00)) {
    return 0x10000 + ((char1 - 0xd800) << 10) + (char2 - 0xdc00);
  } else {
    return char1;
  }
}


////////////////////////////////////////////////////////////////////////////////


function GlyphModel(font, data) {

  // Read-only properties
  //
  this.uid          = data.uid;
  this.originalName = data.css;
  this.originalCode = data.code;

  //
  // Helper properties
  //

  this.font = font;

  // we search by name AND aliases
  this.keywords = [this.originalName].concat(data.search || []).join(',');

  this.charRef = fixedFromCharCode(data.charRef);
  this.cssExt  = data['css-ext'];
  this.tooltip = "name: '" + this.originalName + "'" +
                 (data.search ? ',   tags: ' + data.search.join(', ') : '');

  //
  // Actual properties state
  //

  this.selected = ko.observable(false);
  this.name     = ko.observable(this.originalName);
  this.code     = ko.observable(this.originalCode);

  // Serialization. Make sure to update this method to have
  // desired fields sent to the server (by font builder).
  //
  this.serialize = function () {
    return {
      uid:  this.uid
    , css:  this.name()
    , code: this.code()
    , src:  this.font.fontname
    };
  }.bind(this);

  //
  // Helpers
  //

  this.toggleSelection = function () {
    this.selected(!this.selected());
  }.bind(this);

  // Visibility depends only on search string:
  // - if pattern is too short (0 or 1 symbols)
  // - if pattern found in one of keywords
  //
  this.visible = ko.computed(function () {
    var word = N.app.searchWord();
    return (word.length < 2) || (0 <= this.keywords.indexOf(word));
  }, this);

  // Whenever or not glyph should be treaten as "modified"
  //
  this.isModified = ko.computed(function () {
    return this.selected() ||
      (this.name() !== this.originalName) ||
      (this.code() !== this.originalCode);
  }, this);

  // code value as character (for code editor)
  //
  this.customChar = ko.computed({
    read: function () {
      return fixedFromCharCode(this.code());
    }
  , write: function (value) {
      this.code(fixedCharCodeAt(value));
    }
  , owner: this
  });

  // code value as hex-string (for code editor)
  //
  this.customHex = ko.computed({
    read: function () {
      var code = this.code().toString(16).toUpperCase();
      return "0000".substr(0, Math.max(4 - code.length, 0)) + code;
    }
  , write: function (value) {
      // value must be HEX string - omit invalid chars
      value = 0 + value.replace(/[^0-9a-fA-F]+/g, '');
      this.code(parseInt(value, 16));
    }
  , owner: this
  });

  // Register glyph in the names/codes swap-remap handler
  //
  trackNameChanges(this);
  trackCodeChanges(this);
}

////////////////////////////////////////////////////////////////////////////////

function FontModel(data) {

  //
  // Essential properties
  //

  this.id       = data.id;
  this.fullname = data.font.fullname;
  this.fontname = data.font.fontname;

  this.author   = data.meta.author;
  this.license  = data.meta.license;
  this.homepage = data.meta.homepage;
  this.email    = data.meta.email;
  this.twitter  = data.meta.twitter;
  this.github   = data.meta.github;
  this.dribbble = data.meta.dribbble;

  //
  // View state properties
  //

  this.collapsed = ko.observable(false);

  //
  // Helpers
  //

  this.toggleCollapsed = function () {
    this.collapsed(!this.collapsed());
  }.bind(this);

  this.setCollapseState = function (state) {
    if (state === true || state === false) {
      this.collapsed(state);
    }

    if (this.collapsed()) {
      $('#font-id-'+this.id + " .font-glyphs").slideUp();
    } else {
      $('#font-id-'+this.id + " .font-glyphs").slideDown();
    }
  }.bind(this);

  // animate collapse on state change
  this.collapsed.subscribe(this.setCollapseState);


  // Array of font glyphs
  //
  this.glyphs = _.map(data.glyphs, function (data) {
    return new GlyphModel(this, data);
  }, this);

  // Array of selected glyphs of a font
  //
  this.selectedGlyphs = ko.computed(function () {
    return _.filter(this.glyphs, function (glyph) { return glyph.selected(); });
  }, this).extend({ throttle: 100 });

  // selected glyphs count
  //
  this.selectedCount = ko.computed(function () {
    return this.selectedGlyphs().length;
  }, this);

  // Array of modified glyphs of a font
  //
  this.modifiedGlyphs = ko.computed(function () {
    return _.filter(this.glyphs, function (glyph) { return glyph.isModified(); });
  }, this).extend({ throttle: 100 });

  // Visible glyphs count
  //
  this.visibleCount = ko.computed(function () {
    return _.reduce(this.glyphs, function (cnt, glyph) { return cnt + (glyph.visible() ? 1 : 0); }, 0);
  }, this).extend({ throttle: 100 });
}

////////////////////////////////////////////////////////////////////////////////

function FontsList() {
  // Ordered list, to display on the page
  this.fonts = _.map(embedded_fonts, function (data) {
    return new FontModel(data);
  });

  // Named list, for state import/export
  this.fontsByName = {};
  _.each(this.fonts, function (font) { this.fontsByName[font.fontname] = font; }, this);

  // Array of selected glyphs from all fonts
  //
  this.selectedGlyphs = ko.computed(function () {
    return _.reduce(this.fonts, function (result, font) {
      return result.concat(font.selectedGlyphs());
    }, []);
  }, this).extend({ throttle: 100 });

  // Count of selected glyphs from all fonts
  //
  this.selectedCount = ko.computed(function () {
    return this.selectedGlyphs().length;
  }, this);

  // Returns array of modified glyphs from all fonts
  //
  this.modifiedGlyphs = ko.computed(function () {
    return _.reduce(this.fonts, function (result, font) {
      return result.concat(font.modifiedGlyphs());
    }, []);
  }, this).extend({ throttle: 100 });

  // Count of visible fonts, with reflow compensation
  //
  this.visibleCount = ko.computed(function () {
    return _.reduce(this.fonts, function (cnt, font) { return cnt + (font.visibleCount() ? 1 : 0); }, 0);
  }, this).extend({ throttle: 100 });

  // Returns whenever font list has modified glyphs or collapsed fonts
  //
  this.isModified = ko.computed(function () {
    var value = false;

    _.each(this.fonts, function (font) {
      // We need to call collapsed() of each font to have proper deps graph
      value = font.collapsed() || value;
    });

    // call modifiedGlyphs() in any case to have proper deps graph
    value = !!this.modifiedGlyphs().length || value;

    return value;
  }, this).extend({ throttle: 100 });
}


////////////////////////////////////////////////////////////////////////////////


// Create global `model` and properties
N.app = {};

N.app.searchWord    = ko.observable('').extend({ throttle: 100 });
N.app.searchMode    = ko.computed(function () { return N.app.searchWord().length > 0; });
N.app.fontsList     = new FontsList({ searchWord: N.app.searchWord });
N.app.fontSize      = ko.observable(DEFAULT_GLYPH_SIZE);
N.app.fontName      = ko.observable('');
N.app.cssPrefixText = ko.observable('icon-');
N.app.cssUseSuffix  = ko.observable(false);
N.app.encoding      = ko.observable('pua');

N.app.apiMode     = ko.observable(false);
N.app.apiUrl      = ko.observable('');
N.app.apiSessionId  = null;


N.app.getConfig   = function () {
  var config = {
    name: $.trim(N.app.fontName()),
    css_prefix_text: $.trim(N.app.cssPrefixText()),
    css_use_suffix: N.app.cssUseSuffix()
  };

  config.glyphs = _.map(N.app.fontsList.selectedGlyphs(), function (glyph) {
    return glyph.serialize();
  });

  return config;
};

N.app.serverSave  = function(callback) {
  if (!N.app.apiSessionId) { return; }

  N.io.rpc('fontello.api.update', { sid: N.app.apiSessionId, config: N.app.getConfig() }, callback);
};

////////////////////////////////////////////////////////////////////////////////


N.wire.once('navigate.done', function () {

  //
  // Setup autosave
  //

  N.app.fontsList.isModified.subscribe(function () {
    N.wire.emit('session_save');
  });

  N.app.fontName.subscribe(function () {
    N.wire.emit('session_save');
  });

  N.app.fontSize.subscribe(function () {
    N.wire.emit('session_save');
  });

  N.app.cssPrefixText.subscribe(function () {
    N.wire.emit('session_save');
  });

  N.app.cssUseSuffix.subscribe(function () {
    N.wire.emit('session_save');
  });

  // Try to load config before everything (tweak priority)
  //
  if (!_.isEmpty(N.runtime.page_data && N.runtime.page_data.sid)) {
    N.app.apiSessionId = N.runtime.page_data.sid;
    N.app.apiMode(true);
    N.app.apiUrl(N.runtime.page_data.url || '');
    N.wire.emit('import.obj', N.runtime.page_data.config);
  } else {
    N.wire.emit('session_load');
  }

  //
  // Basic commands
  //

  N.wire.on('cmd:reset_selected', function () {
    _.each(N.app.fontsList.selectedGlyphs(), function (glyph) {
      glyph.selected(false);
    });
  });

  N.wire.on('cmd:reset_all', function (src) {

    // is `src` set, then event was produced
    // by link click and we need confirmation
    if (src) {
      if (!window.confirm(t('confirm_app_reset'))) {
        return;
      }
    }

    N.app.fontName('');
    //N.app.fontSize(N.runtime.config.glyph_size.val);
    N.app.cssPrefixText('icon-');
    N.app.cssUseSuffix(false);

    _.each(N.app.fontsList.fonts, function(font) {
      _.each(font.glyphs, function(glyph) {
        glyph.selected(false);
        glyph.code(glyph.originalCode);
        glyph.name(glyph.originalName);
      });
    });
  });

});
