/*global $, _, ko, N*/


'use strict';


////////////////////////////////////////////////////////////////////////////////


var
render          = require('../../../lib/render/client'),
embedded_fonts  = require('../../../lib/shared/embedded_fonts'),
glyphs_map      = require('../../../lib/shared/glyphs_map');


// Int to char, with fix for big numbers
// see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/fromCharCode
function fixedFromCharCode(code) {
  /*jshint bitwise: false*/
  if (code > 0xffff) {
    code -= 0x10000;
    var surrogate1 = 0xd800 + (code >> 10),
        surrogate2 = 0xdc00 + (code & 0x3ff);
    return String.fromCharCode(surrogate1, surrogate2);
  } else {
    return String.fromCharCode(code);
  }
}


// Char to Int, with fix for big numbers
function fixedCharCodeAt(char) {
  /*jshint bitwise: false*/
  var char1 = char.charCodeAt(0),
      char2 = char.charCodeAt(1);

  if ((char.length >= 2) &&
      ((char1 & 0xfc00) === 0xd800) &&
      ((char2 & 0xfc00) === 0xdc00)) {
    return 0x10000 + ((char1 - 0xd800) << 10) + (char2 - 0xdc00);
  } else {
    return char1;
  }
}


////////////////////////////////////////////////////////////////////////////////


function GlyphModel(font, data) {

  //
  // Essential properties
  //

  this.uid              = data.uid;
  this.originalName     = data.css;
  this.originalCode     = data.code;

  //
  // Helper properties
  //

  this.font             = font;
  this.keywords         = (data.search || []).join(',');
  this.charRef          = fixedFromCharCode(glyphs_map[font.fontname][data.uid]);

  //
  // Actual properties state
  //

  this.selected         = ko.observable(false);
  this.name             = ko.observable(this.originalName);
  this.code             = ko.observable(this.originalCode);

  //
  // Helpers
  //

  this.toggleSelection  = function () {
    this.selected(!this.selected());
  }.bind(this);

  //
  // Whenever or not glyph should be treaten as "modified"
  //

  this.isModified       = ko.computed(function () {
    return  !!this.selected() ||
            this.name() !== this.originalName ||
            this.code() !== this.originalCode;
  }, this);

  //
  // code value as character (for code editor)
  //

  this.customChar       = ko.computed({
    read: function () {
      return fixedFromCharCode(this.code());
    },
    write: function (value) {
      this.code(fixedCharCodeAt(value));
    },
    owner: this
  });

  //
  // code value as hex-string (for code editor)
  //

  this.customHex        = ko.computed({
    read: function () {
      var code = this.code().toString(16).toUpperCase();
      return "0000".substr(0, Math.max(4 - code.length, 0)) + code;
    },
    write: function (value) {
      // value must be HEX string - omit invalid chars
      value = 0 + value.replace(/[^0-9a-f]+/g, '');
      this.code(parseInt(value, 16));
    },
    owner: this
  });

}


function FontModel(data) {

  //
  // Essential properties
  //

  this.id         = data.id;
  this.fullname   = data.font.fullname;
  this.fontname   = data.font.fontname;

  this.author     = data.meta.author;
  this.license    = data.meta.license;
  this.homepage   = data.meta.homepage;
  this.email      = data.meta.email;
  this.twitter    = data.meta.twitter;
  this.github     = data.meta.github;

  //
  // View state properties
  //

  this.collapsed  = ko.observable(false);

  //
  // Helpers
  //

  this.toggleCollapsed = function () {
    this.collapsed(!this.collapsed());
  }.bind(this);

  //
  // Array of font glyphs
  //

  this.glyphs     = _.map(data.glyphs, function (data) {
    return new GlyphModel(this, data);
  }, this);

  //
  // Returns array of selected glyphs of a font
  // throttling compensates mass reflows on multiselect
  //

  this.selectedGlyphs = ko.computed(function () {
    var glyphs = [];

    _.each(this.glyphs, function (glyph) {
      if (glyph.selected()) {
        glyphs.push(glyph);
      }
    });

    return glyphs;
  }, this).extend({ throttle: 100 });

  //
  // Returns array of modified glyphs of a font
  // throttling compensates mass reflows on multiselect
  //

  this.modifiedGlyphs = ko.computed(function () {
    var glyphs = [];

    _.each(this.glyphs, function (glyph) {
      if (glyph.isModified()) {
        glyphs.push(glyph);
      }
    });

    return glyphs;
  }, this).extend({ throttle: 100 });
}


function FontsList() {
  this.fonts = _.map(embedded_fonts, function (data) {
    return new FontModel(data);
  });

  //
  // Returns array of selected glyphs from all fonts
  // throttling compensates mass reflows on multiselect
  //

  this.selectedGlyphs = ko.computed(function () {
    var glyphs = [];

    _.each(this.fonts, function (font) {
      glyphs = glyphs.concat(font.selectedGlyphs());
    });

    return glyphs;
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
    var glyphs = [];

    _.each(this.fonts, function (font) {
      glyphs = glyphs.concat(font.modifiedGlyphs());
    });

    return glyphs;
  }, this).extend({ throttle: 100 });
}


////////////////////////////////////////////////////////////////////////////////


var fontsList = new FontsList();
var fontSize  = ko.observable(16);


////////////////////////////////////////////////////////////////////////////////


N.on('font_size_change', fontSize);


var autoSaveSession = _.debounce(function () {
  var session = { fonts: {} };

  _.each(fontsList.fonts, function (font) {
    var font_data = { collapsed: false, glyphs: [] };

    _.each(font.glyphs, function (glyph) {
      if (glyph.isModified()) {
        font_data.glyphs.push({
          uid:        glyph.uid,
          orig_code:  glyph.originalCode,
          orig_css:   glyph.originalName,
          code:       glyph.code(),
          css:        glyph.name()
        });
      }
    });

    session.fonts[font.id] = font_data;
  });

  N.emit('session_save', session);
}, 500);


fontsList.modifiedGlyphs.subscribe(autoSaveSession);


N.on('session_load', function (session) {
  var fonts = session.fonts || [];

  _.each(fontsList.fonts, function (font) {
    if (!fonts[font.id]) {
      font.collapsed(false);
      return;
    }

    font.collapsed(!!fonts[font.id].collapsed);

    _.each(fonts[font.id].glyphs, function (glyph) {
      _.each(font.glyphs, function (g) {
        if (g.uid === glyph.uid) {
          g.selected(true);
          g.code(glyph.code || glyph.orig_code || g.originalCode);
          g.name(glyph.css || glyph.orig_css || g.originalName);
        }
      });
    });
  });
});


N.on('reset_selected', function () {
  _.each(fontsList.selectedGlyphs(), function (glyph) {
    glyph.selected(false);
  });
});


N.on('reset_all', function () {
  _.each(fontsList.modifiedGlyphs(), function (glyph) {
    glyph.selected(false);
    glyph.code(glyph.originalCode);
    glyph.name(glyph.originalName);
  });
});


$(function () {
  var $view = $(render('app.selector')).appendTo('#selector');

  //
  // Bind model and view
  //

  ko.applyBindings({
    fonts:    fontsList.fonts,
    fontSize: fontSize
  }, $view.get(0));

  //
  // Init multi-select of glyphs
  //

  $view.selectable({
    filter: 'li.glyph:visible',
    distance: 5,
    stop: function () {
      var $els = $view.find('.glyph.ui-selected');

      // prevent from double-triggering event,
      // otherwise click event will be fired as well
      if (1 === $els.length) {
        return;
      }

      $els.each(function () {
        ko.dataFor(this).toggleSelection();
      });
    }
  });
});


////////////////////////////////////////////////////////////////////////////////


N.once('init_complete', function () {
  N.emit('fonts_ready', fontsList);
});
