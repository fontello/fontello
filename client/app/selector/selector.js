/*global $, _, ko, N*/


'use strict';


N.once('page:loaded', function () {
  var
  embedded_fonts  = require('../../../shared/embedded_fonts'),
  glyphs_map      = require('../../../shared/glyphs_map'),
  fromCharCode    = require('../../../shared/util').fixedFromCharCode;


  function GlyphViewModel(font, data) {
    this.font             = font;
    this.uid              = data.uid;
    this.keywords         = (data.search || []).join('|');
    this.codeAsText       = fromCharCode(glyphs_map[font.fontname][data.uid]);
    this.selected         = ko.observable(false);
    this.toggleSelection  = function () { this.selected(!this.selected()); };

    N.emit('glyph:create', this);
  }


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


  $(function () {
    var
    $view = $(N.client.render('app.selector')).appendTo('#selector'),
    model = new SelectorViewModel();

    //
    // Bind model and view
    //

    ko.applyBindings(model, $view.get(0));

    //
    // Bind event handlers
    //

    N.on('font-size:change', function (size) {
      model.fontSize(size);
    });

    N.on('3d-mode:change', function (val) {
      model.has3DEffect(val);
    });


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
  });
});
