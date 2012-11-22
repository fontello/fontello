/*global $, _, ko, N*/


'use strict';


////////////////////////////////////////////////////////////////////////////////


var
render          = require('../../../lib/render/client'),
embedded_fonts  = require('../../../lib/shared/embedded_fonts'),
glyphs_map      = require('../../../lib/shared/glyphs_map'),
fromCharCode    = require('../../../lib/util').fixedFromCharCode;


function toUnicode(code) {
  var c = code.toString(16).toUpperCase();
  return "0000".substr(0, Math.max(4 - c.length, 0)) + c;
}


function GlyphModel(font, data) {
  var self = this;

  this.font             = font;
  this.uid              = data.uid;
  this.keywords         = (data.search || []).join(',');
  this.codeAsText       = fromCharCode(glyphs_map[font.fontname][data.uid]);

  this.selected         = ko.observable(false);

  this.cssNameOriginal  = data.css;
  this.cssName          = ko.observable(this.cssNameOriginal);

  this.charOriginal     = data.code === 32 ? "space" : fromCharCode(data.code);
  this.char             = ko.observable(this.charOriginal);

  this.codeOriginal     = toUnicode(data.code);
  this.code             = ko.observable(this.codeOriginal);

  this.toggleSelection  = function () { this.selected(!this.selected()); };

  this.isModified = function () {
    return  !!this.selected() ||
            this.cssName() !== this.cssNameOriginal ||
            this.code() !== this.codeOriginal ||
            this.char() !== this.charOriginal;
  }.bind(this);
}


function FontModel(data) {
  this.id       = data.id;
  this.fontname = data.font.fontname;

  this.author   = data.meta.author;
  this.license  = data.meta.license;
  this.homepage = data.meta.homepage;
  this.email    = data.meta.email;
  this.twitter  = data.meta.twitter;
  this.github   = data.meta.github;

  this.glyphs   = _.map(data.glyphs, function (data) {
    return new GlyphModel(this, data);
  }, this);
}


function FontsList() {
  this.fonts = _.map(embedded_fonts, function (data) {
    return new FontModel(data);
  });

  this.selectedGlyphs = ko.computed(function () {
    var glyphs = [];

    _.each(this.fonts, function (font) {
      _.each(font.glyphs, function (glyph) {
        if (glyph.selected()) {
          glyphs.push(glyph);
        }
      });
    });

    return glyphs;
  }, this);
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
          uid: glyph.uid
        });
      }
    });

    session.fonts[font.id] = font_data;
  });

  N.emit('session_save', session);
}, 500);


_.each(fontsList.fonts, function (font) {
  _.each(font.glyphs, function (glyph) {
    glyph.selected.subscribe(autoSaveSession);
  });
});


N.on('reset_all', function () {
  _.each(fontsList.fonts, function (font) {
    _.each(font.glyphs, function (glyph) {
      glyph.selected(false);
      glyph.code(glyph.codeOriginal);
      glyph.cssName(glyph.cssNameOriginal);
    });
  });
});


N.on('reset_selection', function () {
  _.each(fontsList.selectedGlyphs(), function (glyph) {
    glyph.selected(false);
  });
});


N.on('session_load', function (session) {
  var fonts = session.fonts || [];

  _.each(fontsList.fonts, function (font) {
    if (!fonts[font.id]) {
      return;
    }

    _.each(fonts[font.id].glyphs, function (glyph) {
      _.each(font.glyphs, function (g) {
        if (g.uid === glyph.uid) {
          g.selected(true);
        }
      });
    });
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
