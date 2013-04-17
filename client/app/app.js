'use strict';


/*global ko*/


var _ = require('lodash');


var embedded_fonts    = require('../../lib/embedded_fonts/configs')
  , glyphs_map        = require('../../lib/embedded_fonts/glyphs_map')
  , trackNameChanges  = require('./_namesTracker')
  , trackCodeChanges  = require('./_codesTracker');


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


function GlyphModel(font, data, options) {

  //
  // Essential properties
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


  this.charRef = fixedFromCharCode(glyphs_map[font.fontname][data.uid]);
  this.cssExt  = data['css-ext'];
  this.tooltip = "name: '" + this.originalName + "'" +
                 (data.search ? ',   tags: ' + data.search.join(', ') : '');

  //
  // Actual properties state
  //

  this.selected = ko.observable(false);
  this.name     = ko.observable(this.originalName);
  this.code     = ko.observable(this.originalCode);

  //
  // Serialization. Make sure to update this method to have
  // desired fields sent to the server (by font builder).
  //

  this.serialize = function () {
    return {
      uid:       this.uid

    , orig_css:  this.originalName
    , orig_code: this.originalCode

    , css:       this.name()
    , code:      this.code()

    , src:       this.font.fontname
    };
  }.bind(this);

  //
  // Helpers
  //

  this.toggleSelection = function () {
    this.selected(!this.selected());
  }.bind(this);

  //
  // Whenver or not glyph should be visible
  //

  this.visible = ko.computed(function () {
    return 0 <= this.keywords.indexOf(options.searchWord());
  }, this);

  //
  // Whenever or not glyph should be treaten as "modified"
  //

  this.isModified = ko.computed(function () {
    return this.selected() ||
      (this.name() !== this.originalName) ||
      (this.code() !== this.originalCode);
  }, this);

  //
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

  //
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

  //
  // Register glyph in the names/codes swap-remap handler
  //

  trackNameChanges(this);
  trackCodeChanges(this);
}


function FontModel(data, options) {

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

  // animation on collapse state change
  this.collapsed.subscribe(this.setCollapseState);

  //
  // Array of font glyphs
  //

  this.glyphs = _.map(data.glyphs, function (data) {
    return new GlyphModel(this, data, options);
  }, this);

  //
  // Returns array of selected glyphs of a font
  // throttling compensates mass reflows on multiselect
  //

  this.selectedGlyphs = ko.computed(function () {
    return _.filter(this.glyphs, function (glyph) { return glyph.selected(); });
  }, this).extend({ throttle: 100 });

  //
  // Returns array of modified glyphs of a font
  // throttling compensates mass reflows on multiselect
  //

  this.modifiedGlyphs = ko.computed(function () {
    return _.filter(this.glyphs, function (glyph) { return glyph.isModified(); });
  }, this).extend({ throttle: 100 });

  //
  // Returns amount of visible glyphs
  // throttling compensates mass reflows on multiselect
  //

  this.visibleCount = ko.computed(function () {
    return _.reduce(this.glyphs, function (cnt, glyph) { return cnt + (glyph.visible() ? 1 : 0); }, 0);
  }, this).extend({ throttle: 100 });
}


function FontsList(options) {
  this.fonts = _.map(embedded_fonts, function (data) {
    return new FontModel(data, options);
  });

  //
  // Returns array of selected glyphs from all fonts
  // throttling compensates mass reflows on multiselect
  //

  this.selectedGlyphs = ko.computed(function () {
    return _.reduce(this.fonts, function (result, font) {
      return result.concat(font.selectedGlyphs());
    }, []);
  }, this).extend({ throttle: 100 });

  //
  // Returns amount of selected glyphs from all fonts
  //

  this.selectedCount = ko.computed(function () {
    return this.selectedGlyphs().length;
  }, this);

  //
  // Returns array of modified glyphs from all fonts
  // throttling compensates mass reflows on multiselect
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

  //
  // Returns whenever font list has modified glyphs or collapsed fonts
  // throttling compensates mass reflows on multiselect
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

N.app.searchWord = ko.observable('').extend({ throttle: 100 });
N.app.searchMode  = ko.computed(function () { return N.app.searchWord().length > 0; });
N.app.fontsList   = new FontsList({ searchWord: N.app.searchWord });
N.app.fontSize    = ko.observable(N.runtime.config.glyph_size.val).extend({ throttle: 100 });
N.app.fontName    = ko.observable('');


// Autosave generator - after every fontlist change
// emit session change (debounced)
//
N.wire.once('navigate.done', function () {

  N.app.fontsList.isModified.subscribe(function () {
    N.wire.emit('session_save');
  });

  N.app.fontName.subscribe(function () {
    N.wire.emit('session_save');
  });

  N.app.fontSize.subscribe(function () {
    N.wire.emit('session_save');
  });

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

    _.each(N.app.fontsList.fonts, function(font) {
      _.each(font.glyphs, function(glyph) {
        glyph.selected(false);
        glyph.code(glyph.originalCode);
        glyph.name(glyph.originalName);
      });
    });
  });

});
