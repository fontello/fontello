/*global nodeca, _, $, Modernizr, Backbone*/

"use strict";

module.exports = function () {
  var fonts, result, presets, toolbar, tabs, selector, preview, editor;


  // check browser's capabilities
  if (!Modernizr.fontface) {
    nodeca.client.fontomas.logger.error("bad browser");
    $('#err-bad-browser').modal({backdrop: 'static', keyboard: false});
    return;
  }


  //
  // Models
  //


  // list of all fonts
  fonts = new (Backbone.Collection.extend({
    model: nodeca.client.fontomas.models.font
  }))(nodeca.shared.fontomas.embedded_fonts);

  // special collection of selected glyphs (cache) with
  // extra model logic (validate, config creation and
  // download requesting), but which can still be used
  // as a normal collection for the views
  result = new nodeca.client.fontomas.models.result;

  // Dummy colection that saves itself into localStorage
  presets = new nodeca.client.fontomas.models.presets;


  //
  // Views (UI)
  //


  toolbar   = new nodeca.client.fontomas.ui.toolbar;
  tabs      = new nodeca.client.fontomas.ui.tabs;
  selector  = new nodeca.client.fontomas.ui.panes.selector({model: fonts});
  preview   = new nodeca.client.fontomas.ui.panes.preview({model: result});
  editor    = new nodeca.client.fontomas.ui.panes.codes_editor({model: result});


  //
  // Initialization
  //


  fonts.each(function (font) {
    font.eachGlyph(function (glyph) {
      toolbar.addKeywords(glyph.get('source').search || []);
      glyph.on('change:selected', function (glyph, val) {
        result[val ? 'add' : 'remove'](glyph);
      });
    });
  });


  toolbar.on('click:download', function () {
    result.startDownload($('#result-fontname').val());
  });


  toolbar.on('change:glyph-size', _.debounce(function (size) {
    selector.changeGlyphSize(size);
  }, 250));


  // perform glyphs search
  var $glyphs = $('.glyph');
  toolbar.on('change:search', function (q) {
    q = String(q);

    $glyphs.hide().filter(function () {
      var model = $(this).data('model');
      return model && 0 <= model.keywords.indexOf(q);
    }).show();
  });


  // update selected glyphs count
  result.on('add remove', function () {
    var count = result.length;

    toolbar.setGlyphsCount(count);
    tabs.setGlyphsCount(count);
  });


  // show selector tab after  load complete
  tabs.activate('#selector');


  // Attach tooltip handler to matching elements
  $('._tip').tooltip();


  // Attach collapse handler to matching elements
  $('._collapser').ndCollapser();


  // Initialize clear button
  $('[data-fontello-reset]').click(function () {
    var scope = $(this).data('fontello-reset');

    fonts.each(function (f) {
      f.eachGlyph(function (g) {
        g.toggle('selected', false);

        if ('all' === scope) {
          g.unset('code');
          g.unset('css');
        }
      });
    });
  });


  // live update of amount of online clients
  var $users_count = $('#stats-online');
  nodeca.runtime.sio.on('users_online', function (count) {
    $users_count.text(count);
  });


  function load_preset(preset) {
    var data = preset.get('data') || {};

    fonts.each(function (f) {
      f.eachGlyph(function (g) {
        _.each(data.selected, function (s) {
          if (s.font_id === f.get('id') && s.glyph_id === g.cid) {
            g.toggle('selected');
          }
        });

        _.each(data.changes, function (c) {
          if (c.font_id === f.get('id') && c.glyph_id === g.cid) {
            g.set({
              code: c.code,
              css:  c.css
            });
          }
        });
      });
    });
  }

  function save_preset(preset) {
    var data = {
      collapsed: [], // not implemented yet
      selected:  [],
      changes:   []
    };

    fonts.each(function (f) {
      f.eachGlyph(function (g) {
        if (g.get('selected')) {
          data.selected.push({
            font_id: f.get('id'),
            glyph_id: g.cid
          });
        }

        if (g.isModified()) {
          data.changes.push({
            font_id: f.get('id'),
            glyph_id: g.cid,
            code: g.get('code'),
            css: g.get('css')
          });
        }
      });
    });

    preset.set('data', data).save();
  }


  var save_current_state = _.throttle(function () {
    save_preset(presets.at(0));
  }, 1000);


  fonts.each(function (f) {
    f.eachGlyph(function (g) {
      g.on('change:selected change:code change:css', save_current_state);
    });
  });


  load_preset(presets.at(0));
};
