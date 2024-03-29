// Models classes init. Executed once, as soon as possible
//
'use strict';

var _  = require('lodash');
var ko = require('knockout');

var SvgPath        = require('svgpath');

var codesTracker   = require('./_lib/codes_tracker')(N);
var namesTracker   = require('./_lib/names_tracker');
var fontface       = require('./_lib/fontface');

var utils          = require('../_lib/utils');
var embedded_fonts = require('../../../lib/embedded_fonts/client_config');


function uid() {
  /*eslint-disable no-bitwise*/
  return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, function () {
    return ((Math.random() * 16) | 0).toString(16);
  });
}

////////////////////////////////////////////////////////////////////////////////

N.wire.once('navigate.done', { priority: -100 }, function () {

  function GlyphModel(data, parent) {
    var self = this;

    // Read-only properties
    //
    this.uid          = data.uid || uid();
    this.originalName = data.css;
    this.originalCode = data.code;

    //
    // Helper properties
    //

    this.font = parent;

    // we search by name AND aliases
    this.search  = data.search || [];
    this.keywords = [ this.originalName ].concat(this.search).join(',');

    this.charRef = utils.fixedFromCharCode(data.charRef);

    this.cssExt  = data['css-ext'];
    this.tooltip = 'name: \'' + this.originalName + '\'' +
                   (data.search ? ',   tags: ' + data.search.join(', ') : '');

    //
    // Actual properties state
    //

    // actual `selected` value will be set after codes/names trackers init
    this.selected = ko.observable(false);
    this.name     = ko.observable(this.originalName);
    this.code     = ko.observable(this.originalCode);

    this.svg      = data.svg;

    this.name.subscribe(function () {
      N.wire.emit('session_save');
    });

    this.code.subscribe(function () {
      N.wire.emit('session_save');
    });


    // Change glyph selection
    //
    this.toggleSelect = function (value) {
      self.selected(value);

      if (value) {
        self.font.fontsList.selectedGlyphs.push(self);
      } else {
        self.font.fontsList.selectedGlyphs.remove(self);
      }
    };

    // Serialization. Make sure to update this method to have
    // desired fields sent to the server (by font builder).
    //
    this.serialize = function () {
      var res = {
        uid       : self.uid,
        css       : self.name(),
        code      : self.code(),
        src       : self.font.fontname
      };

      if (self.font.fontname === 'custom_icons') {
        res.selected = self.selected();
        res.svg = self.svg;
        res.search = self.search;
      }

      return res;
    };

    //
    // Helpers
    //

    this.selectOnEnter = function (glyph, event) {
      if ((event.keyCode || event.which) === 13) {
        self.toggleSelect(!self.selected());
      }

      return true;
    };

    this.remove = function () {
      self.font.removeGlyph(self.uid);
    };

    // Visibility depends only on search string:
    // - if pattern is too short (0 or 1 symbols)
    // - if pattern found in one of keywords
    //
    this.visible = ko.computed(() => {
      var word = N.app.searchWord();
      return (word.length < 2) || (this.keywords.indexOf(word) >= 0);
    }, this);

    // code value as character (for code editor)
    //
    this.customChar = ko.computed({
      read() {
        return utils.fixedFromCharCode(this.code());
      },
      write(value) {
        this.code(utils.fixedCharCodeAt(value));
      },
      owner: this
    });

    // code value as hex-string (for code editor)
    //
    this.customHex = ko.computed({
      read() {
        var code = this.code().toString(16).toUpperCase();
        return '0000'.substr(0, Math.max(4 - code.length, 0)) + code;
      },
      write(value) {
        // value must be HEX string - omit invalid chars
        value = 0 + value.replace(/[^0-9a-fA-F]+/g, '');
        this.code(parseInt(value, 16));
      },
      owner: this
    });

    // Whenever or not glyph should be treaten as "modified"
    //
    this.isModified = function () {
      return self.selected() ||
        (self.name() !== self.originalName) ||
        (self.code() !== self.originalCode);
    };

    // Do selection before attaching remapper, to keep codes
    // on config import
    this.toggleSelect(!!data.selected);

    // FIXME: do better cleanup on glyph remove
    // Register glyph in the names/codes swap-remap handlers.
    //
    codesTracker.observeGlyph(this);
    namesTracker.observeGlyph(this);
  }


  ////////////////////////////////////////////////////////////////////////////////

  function FontModel(data, parent) {
    var self = this;

    this.fontsList = parent;

    //
    // Essential properties
    //
    this.fullname = (data.font || {}).fullname;
    this.fontname = (data.font || {}).fontname; // also used as font id
    this.version  = (data.font || {}).version;

    this.author   = (data.meta || {}).author;
    this.license  = (data.meta || {}).license;
    this.homepage = (data.meta || {}).homepage;
    this.email    = (data.meta || {}).email;
    this.twitter  = (data.meta || {}).twitter;
    this.github   = (data.meta || {}).github;
    this.dribbble = (data.meta || {}).dribbble;

    //
    // View state properties
    //

    this.collapsed = ko.observable(false);

    // Map for fast lookup
    // { id: glyph }
    this.glyphMap = {};

    // font glyphs objervable array
    this.glyphs = ko.observableArray();

    this.addGlyph = function (data) {
      var glyph = new GlyphModel(data, this);

      this.glyphMap[glyph.uid] = glyph;

      parent.track(glyph);

      this.glyphs.push(glyph);

      return glyph;
    };

    this.removeGlyph = function (uid) {
      // when no param - remove all
      if (!uid) {
        self.glyphs.peek().slice().forEach(function (g) { self.removeGlyph(g.uid); });
        return;
      }

      self.glyphMap[uid].toggleSelect(false);

      parent.untrack(this.glyphMap[uid]);

      var idx = _.findIndex(self.glyphs.peek(), function (g) { return g.uid === uid; });
      if (idx !== -1) {
        self.glyphs.peek().splice(idx, 1);
      }
      self.glyphs.valueHasMutated();

      delete self.glyphMap[uid];
    };

    // Visible glyphs count
    //
    this.visibleCount = ko.computed(() =>
      this.glyphs().reduce((cnt, glyph) => (cnt + (glyph.visible() ? 1 : 0)), 0)
    ).extend({ throttle: 100 });

    // selected glyphs count
    //
    this.selectedCount = ko.computed(() =>
      this.glyphs().reduce((cnt, glyph) => (cnt + (glyph.selected() ? 1 : 0)), 0)
    ).extend({ throttle: 100 });


    //
    // Helpers
    //

    // save session on change
    this.collapsed.subscribe(function () {
      N.wire.emit('session_save');
    });

    this.makeSvgFont = function () {
      if (!this.glyphs().length) {
        return;
      }

      var conf             = {};
      conf.font            = {};
      conf.font.fontname   = this.fontname;
      conf.font.familyname = this.fontname;

      // We always make font in 1000 units per em grid. So, if user
      // changes metrics - recalculate ascent/descent to get tha same baseline.
      //
      conf.font.ascent     = +(N.app.fontAscent() * 1000 / N.app.fontUnitsPerEm()).toFixed(0);
      conf.font.descent    = conf.font.ascent - 1000;

      conf.glyphs = _.map(this.glyphs(), function (glyph){
        return {
          css:    glyph.originalName,
          code:   glyph.charRef.charCodeAt(0),

          d:      new SvgPath(glyph.svg.path)
                    .scale(1, -1)
                    .translate(0, conf.font.ascent)
                    .abs()
                    .round(1)
                    .toString(),

          width:  glyph.svg.width
        };
      });

      var svgFontTemplate = _.template(
        '<?xml version="1.0" standalone="no"?>\n' +
        '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
        '<svg xmlns="http://www.w3.org/2000/svg">\n' +
        '<defs>\n' +
        '<font id="_${font.fontname}" horiz-adv-x="${font.ascent - font.descent}" >\n' +
        '<font-face' +
        ' font-family="${font.familyname}"' +
        ' font-weight="400"' +
        ' font-stretch="normal"' +
        ' units-per-em="${font.ascent - font.descent}"' +
        ' ascent="${font.ascent}"' +
        ' descent="${font.descent}"' +
        ' />\n' +

        '<missing-glyph horiz-adv-x="${font.ascent - font.descent}" />\n' +

        '<% glyphs.forEach(function(glyph) { %>' +
          '<glyph' +
          ' glyph-name="${glyph.css}"' +
          ' unicode="&#x${glyph.code.toString(16)};"' +
          ' d="${glyph.d}"' +
          ' horiz-adv-x="${glyph.width}"' +
          ' />\n' +
        '<% }); %>' +

        '</font>\n' +
        '</defs>\n' +
        '</svg>'
      );

      return svgFontTemplate(conf);
    };

    //
    // Init
    //

    // Load glyphs
    //
    _.forEach(data.glyphs, function (glyphData) {
      self.addGlyph(glyphData);
    });


    // Rebuild font on glyphs list change
    //
    this.glyphs.subscribe(function (currentGlyphs) {

      // Only custom icons require font generation
      if (self.fontname !== 'custom_icons') {
        return;
      }

      // Force session save, because we keep custom icons sources in it.
      N.wire.emit('session_save');

      // Empty collection doesn't need font update
      if (!currentGlyphs.length) {
        return;
      }

      var ff;

      try {
        ff = fontface(self.makeSvgFont(), self.fontname);
      } catch (err) {
        /* eslint-disable-next-line no-console */
        console.log(err);
        N.wire.emit('notify', String(err.message || err));
        return;
      }

      var styleTemplate = _.template(
        '<style id="ff_${fontId}" type="text/css">\n ${fontface}' +
        '  .font-${fontId} { font-family: "fml_${fontId}"; }\n' +
        '</style>\n');

      var style = styleTemplate({
        fontface : ff,
        fontId : self.fontname
      });

      $('#ff_' + self.fontname).remove();
      $(style).appendTo('head');
    });
  }


  ////////////////////////////////////////////////////////////////////////////////

  function FontsList() {
    var self = this;
    this.fonts = [];

    // Map for fast glyph lookup
    // { id: glyph }
    this.glyphMap = {};

    // Array of selected glyphs from all fonts
    //
    this.selectedGlyphs = ko.observableArray();

    this.selectedGlyphs.subscribe(function () {
      N.wire.emit('session_save');
    });

    // Count of selected glyphs from all fonts
    //
    this.selectedCount = ko.computed(() => this.selectedGlyphs().length).extend({ throttle: 100 });

    this.track = function (glyph) {
      this.glyphMap[glyph.uid] = glyph;
    };

    this.untrack = function (glyph) {
      delete self.glyphMap[glyph.uid];
    };

    //
    // Init
    //

    // Create custom icons stub
    this.fonts.push(new FontModel(
      {
        font: { fontname: 'custom_icons', fullname: t('custom_icons_name') }
      },
      self
    ));

    // Ordered list, to display on the page
    this.fonts.push.apply(this.fonts, _.map(embedded_fonts, function (data) {
      return new FontModel(data, self);
    }));

    // Count of visible fonts, with reflow compensation
    //
    this.visibleCount = ko.computed(() =>
      _.reduce(this.fonts, (cnt, font) => (cnt + (font.visibleCount() ? 1 : 0)), 0)
    , this).extend({ throttle: 100 });


    this.unselectAll = function () {
      this.selectedGlyphs.peek().slice().forEach(function (glyph) {
        glyph.selected(false);
      });
      this.selectedGlyphs.removeAll();
    };

    // Search font by name
    //
    this.getFont = function (name) {
      return _.find(this.fonts, function (font) { return font.fontname === name; });
    };

    this.getGlyph = function (uid) {
      return this.glyphMap[uid];
    };

    // Register font list in the names/codes swap-remap handlers.
    //
    codesTracker.observeFontsList(this);
    namesTracker.observeFontsList(this);
  }


  // Make models available for other modules
  N.models = {};
  N.models.GlyphModel = GlyphModel;
  N.models.FontModel  = FontModel;
  N.models.FontsList   = FontsList;

});
