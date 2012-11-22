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


function GlyphViewModel(font, data) {
  var self = this;

  this.font             = font;
  this.uid              = data.uid;
  this.keywords         = (data.search || []).join(',');
  this.codeAsText       = fromCharCode(glyphs_map[font.fontname][data.uid]);
  this.cssName          = data.css;

  this.char             = data.code === 32 ? "space" : fromCharCode(data.code);
  this.code             = toUnicode(data.code);

  this.selected         = ko.observable(false);
  this.toggleSelection  = function () { this.selected(!this.selected()); };

  this.selected.subscribe(function (value) {
    var type = value ? 'selected' : 'unselected';
    N.emit('glyph:' + type, self);
  });


  this.reset = function () {
    this.selected(false);
  };

  this.isModified = function () {
    return !!this.selected();
  }.bind(this);
}


GlyphViewModel.prototype.inspect = function () {
  return JSON.stringify({
    uid:  this.uid,
    font: {
      id:   this.font.id,
      name: this.font.fontname
    }
  });
};


GlyphViewModel.prototype.toString = function () {
  return  'GlyphViewModel(' + this.inspect() + ')';
};


function FontsViewModel(data) {
  this.id       = data.id;
  this.fontname = data.font.fontname;

  this.author   = data.meta.author;
  this.license  = data.meta.license;
  this.homepage = data.meta.homepage;
  this.email    = data.meta.email;
  this.twitter  = data.meta.twitter;
  this.github   = data.meta.github;

  this.glyphs   = _.map(data.glyphs, function (data) {
    return new GlyphViewModel(this, data);
  }, this);
}


function SelectorViewModel() {
  this.has3DEffect  = ko.observable(true);
  this.fontSize     = ko.observable(16);

  this.fonts        = _.map(embedded_fonts, function (data) {
    return new FontsViewModel(data);
  });
}


////////////////////////////////////////////////////////////////////////////////


var model = new SelectorViewModel();


//
// Bind event handlers
//


N.on('font-size:change', function (size) {
  model.fontSize(size);
});


N.on('3d-mode:change', function (val) {
  model.has3DEffect(val);
});


var autoSaveSession = _.debounce(function () {
  var data = {};

  _.each(model.fonts, function (font) {
    var font_data = { collapsed: false, glyphs: [] };

    _.each(font.glyphs, function (glyph) {
      if (glyph.isModified()) {
        font_data.glyphs.push({
          uid:  glyph.uid
        });
      }
    });

    data[font.id] = font_data;
  });

  N.emit('session:save', { fonts: data });
}, 500);


N.on('glyph:selected',    autoSaveSession);
N.on('glyph:unselected',  autoSaveSession);


N.on('app:reset', function () {
  _.each(model.fonts, function (font) {
    _.each(font.glyphs, function (glyph) {
      glyph.reset();
    });
  });
});


N.on('session:load', function (data) {
  data = data.fonts;

  _.each(model.fonts, function (font) {
    if (!data[font.id]) {
      return;
    }

    _.each(data[font.id].glyphs, function (glyph) {
      _.each(font.glyphs, function (g) {
        if (g.uid === glyph.uid) {
          g.selected(true);
        }
      });
    });
  });
});


////////////////////////////////////////////////////////////////////////////////


N.once('page:loaded', function () {
  var $view = $(render('app.selector')).appendTo('#selector');

  //
  // Bind model and view
  //

  ko.applyBindings(model, $view.get(0));


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

      N.emit('batch-glyphs-select:start');
      $els.each(function () {
        ko.dataFor(this).toggleSelection();
      });
      N.emit('batch-glyphs-select:finish');
    }
  });


  N.emit('fonts:ready');
});
