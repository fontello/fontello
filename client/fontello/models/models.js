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

    this.selected.subscribe(function () {
      N.wire.emit('session_save');
    });

    this.name.subscribe(function () {
      N.wire.emit('session_save');
    });

    this.code.subscribe(function () {
      N.wire.emit('session_save');
    });

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
        self.selected(!self.selected());
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
    this.visible = ko.computed(function () {
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
    this.selected(!!data.selected);

    // FIXME: do better cleanup on glyph remove
    // Register glyph in the names/codes swap-remap handlers.
    //
    codesTracker.observe(this);
    namesTracker.observe(this);
  }


  ////////////////////////////////////////////////////////////////////////////////

  function FontModel(data, parent) {
    var self = this;

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

    // track subscribtions for cleanup
    this.subscriptions = {};

    // font glyphs objervable array
    this.glyphs = ko.observableArray();
    // selected glyphs uids observable array
    // dont't store full glyphs for simplisity
    this.selectedGlyphs = ko.observableArray();

    // State flags for bulk updates
    var _locked = 0; // can be nested
    var _selected_dirty = false;
    var _glyphs_dirty = false;

    this.lock = function () {
      _locked++;
    };

    this.unlock = function () {
      if (!_locked) { return; }   // Exit if already unlocked;
      if (--_locked) { return; }  // Exit if lock was nested

      if (_glyphs_dirty) {
        this.glyphs.valueHasMutated();
        _glyphs_dirty = false;
      }
      if (_selected_dirty) {
        this.selectedGlyphs.valueHasMutated();
        _selected_dirty = false;
      }
    };

    this.addGlyph = function (data) {
      var glyph = new GlyphModel(data, this);

      this.glyphMap[glyph.uid] = glyph;
      if (parent) {
        parent.track(glyph);
      }

      if (!_locked) {
        this.glyphs.push(glyph);
        if (glyph.selected()) {
          this.selectedGlyphs.push(glyph.uid);
        }
      } else {
        _glyphs_dirty = true;
        this.glyphs.peek().push(glyph);
        if (glyph.selected()) {
          _selected_dirty = true;
          this.selectedGlyphs.peek().push(glyph.uid);
        }
      }

      this.subscriptions[glyph.uid] = this.subscriptions[glyph.uid] || [];

      this.subscriptions[glyph.uid].push(
        glyph.selected.subscribe(function (value) {
          var selectedList = self.selectedGlyphs.peek();

          if (value) {
            if (selectedList.indexOf(glyph.uid) !== -1) { return; }
            selectedList.push(glyph.uid);
          } else {
            var idx = selectedList.indexOf(glyph.uid);
            if (idx === -1) { return; }
            selectedList.splice(idx, 1);
          }

          if (!_locked) {
            self.selectedGlyphs.valueHasMutated();
          } else {
            _selected_dirty = true;
          }
        })
      );
    };

    this.removeGlyph = function (uid) {
      // when no param - remove all
      if (!uid) {
        self.glyphs.peek().slice().forEach(function (g) { self.removeGlyph(g.uid); });
        return;
      }

      self.glyphMap[uid].selected(false);

      _.forEach(self.subscriptions[uid], function (subs) { subs.dispose(); });

      parent.untrack(this.glyphMap[uid]);

      var idx = _.findIndex(self.glyphs.peek(), function (g) { return g.uid === uid; });
      if (idx !== -1) {
        self.glyphs.peek().splice(idx, 1);
      }
      if (!_locked) {
        self.glyphs.valueHasMutated();
      } else {
        _glyphs_dirty = true;
      }

      delete self.glyphMap[uid];
    };

    // Visible glyphs count
    //
    this.visibleCount = ko.computed(function () {
      return _.reduce(self.glyphs(), function (cnt, glyph) { return cnt + (glyph.visible() ? 1 : 0); }, 0);
    }).extend({ throttle: 100 });

    // selected glyphs count
    //
    this.selectedCount = ko.computed(function () {
      return self.selectedGlyphs().length;
    }).extend({ throttle: 100 });


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
    this.lock();

    _.forEach(data.glyphs, function (glyphData) {
      self.addGlyph(glyphData);
    });

    this.unlock();


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

      var ff = fontface(self.makeSvgFont(), self.fontname);

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

    // track subscribtions for cleanup
    this.subscriptions = {};

    // Array of selected glyphs from all fonts
    //
    this.selectedGlyphs = ko.observableArray();

    // Count of selected glyphs from all fonts
    //
    this.selectedCount = ko.computed(function () {
      return self.selectedGlyphs().length;
    }).extend({ throttle: 100 });

    // State flags for bulk updates
    var _locked = 0;  // can be nested
    var _selected_dirty = false;

    // Lock/Unlock ko refreshes, needed on mass imports
    //
    this.lock = function () {
      // lock fonts only once
      if (!_locked) {
        this.fonts.forEach(function (font) { font.lock(); });
      }
      _locked++;
    };
    this.unlock = function () {
      if (!_locked) { return; }   // Exit if already unlocked;
      if (--_locked) { return; }  // Exit if lock was nested

      this.fonts.forEach(function (font) { font.unlock(); });

      if (_selected_dirty) {
        _selected_dirty = false;
        this.selectedGlyphs.valueHasMutated();
      }
    };

    this.track = function (glyph) {
      this.glyphMap[glyph.uid] = glyph;

      if (glyph.selected()) {
        if (!_locked) {
          this.selectedGlyphs.push(glyph);
        } else {
          _selected_dirty = true;
          this.selectedGlyphs.peek().push(glyph);
        }
      }

      this.subscriptions[glyph.uid] = this.subscriptions[glyph.uid] || [];

      glyph.selected.subscribe(function (value) {
        var selectedList = self.selectedGlyphs.peek();
        if (value) {
          //if (_.findIndex(selectedList, function(g) { return g.uid === glyph.uid; }) !== -1) { return; }
          selectedList.push(glyph);
        } else {
          var idx = _.findIndex(selectedList, function (g) { return g.uid === glyph.uid; });
          if (idx === -1) { return; }
          selectedList.splice(idx, 1);
        }

        if (!_locked) {
          self.selectedGlyphs.valueHasMutated();
        } else {
          _selected_dirty = true;
        }
      });
    };

    this.untrack = function (glyph) {
      _.forEach(self.subscriptions[glyph.uid], function (subs) { subs.dispose(); });
      delete self.glyphMap[uid];
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
    this.visibleCount = ko.computed(function () {
      return _.reduce(this.fonts, function (cnt, font) { return cnt + (font.visibleCount() ? 1 : 0); }, 0);
    }, this).extend({ throttle: 100 });


    this.unselectAll = function () {
      this.lock();
      this.selectedGlyphs.peek().slice().forEach(function (glyph) {
        glyph.selected(false);
      });
      this.unlock();
    };

    // Search font by name
    //
    this.getFont = function (name) {
      return _.find(this.fonts, function (font) { return font.fontname === name; });
    };

    this.getGlyph = function (uid) {
      return this.glyphMap[uid];
    };

  }


  // Make models available for other modules
  N.models = {};
  N.models.GlyphModel = GlyphModel;
  N.models.FontModel  = FontModel;
  N.models.FontsList   = FontsList;

});
