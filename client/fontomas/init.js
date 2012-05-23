/*global nodeca, _, $, Modernizr, Backbone, window*/

"use strict";

module.exports = function () {
  var fonts, result, toolbar, tabs, selector, preview, editor;


  // check browser's capabilities
  if (!Modernizr.fontface) {
    nodeca.logger.error("bad browser");
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
  $('[data-fontello-reset]').click(function (event) {
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

    // switch to selctor pane
    tabs.activate('#selector');

    // do not change location
    event.preventDefault();
  });


  // live update of amount of online clients
  var $users_count = $('#stats-online');
  nodeca.runtime.faye.subscribe('/stats/users_online', function (count) {
    $users_count.text(count);
  });


  //
  // Presets
  //


  // Dummy colection that saves itself into localStorage
  var presets = new nodeca.client.fontomas.models.presets;



  // data of each preset is:
  //
  //  version:      (String)  version of fontello, created preset
  //  name:         (String)  fontname of the preset
  //  fonts:        (Object)  configuration of fonts
  //    collapsed:  (Boolean) whenever font is collapsed or not
  //    glyphs:     (Array)   list of modified glyphs
  //      - uid:    (String)
  //      - cid:    (String)
  //      - code:   (Number)
  //      - css:    (String)


  function load_preset(preset) {
    var data = preset.get('data');

    if (!data) {
      return;
    }

    if (data.version !== nodeca.runtime.version) {
      preset.destroy();
      nodeca.client.fontomas.util.notify('alert',
        'Presets were saved in an older version of fontello.');
      return;
    }

    $('#result-fontname').val(data.name);

    fonts.each(function (font) {
      var font_data = data.fonts[font.get('id')];

      // reset glyphs
      font.eachGlyph(function (glyph) {
        glyph.set({
          selected: false,
          code:     null,
          css:      null
        });
      });

      // update modified glyphs
      _.each(font_data.glyphs, function (glyph_data) {
        var glyph = font.getGlyph(glyph_data);

        if (glyph) {
          glyph.set({
            selected: glyph_data.selected,
            code:     glyph_data.code,
            css:      glyph_data.css,
          });
        }
      });
    });
  }

  function save_preset(preset) {
    var data = {
      version:  nodeca.runtime.version,
      name:     $('#result-fontname').val(),
      fonts:    {}
    };

    fonts.each(function (f) {
      var font_data = data.fonts[f.get('id')] = {
        collapsed:  f.get('collapsed'),
        glyphs:     []
      };

      f.eachGlyph(function (g) {
        if (g.get('selected') || g.isModified()) {
          font_data.glyphs.push({
            uid:      g.get('uid'),
            cid:      g.cid,
            selected: g.get('selected'),
            code:     g.get('code'),
            css:      g.get('css')
          });
        }
      });
    });

    preset.set('data', data).save();
  }


  var save_current_state = _.throttle(function () {
    save_preset(presets.at(0));
  }, 1000);


  // save current state upon fontname change
  $('#result-fontname').change(save_current_state);


  // change current state when some of glyph properties were changed
  fonts.each(function (f) {
    f.eachGlyph(function (g) {
      g.on('change:selected change:code change:css', save_current_state);
    });
  });


  load_preset(presets.at(0));


  if ('development' === nodeca.runtime.env) {
    // export some internal collections for debugging
    window.fontello_fonts   = fonts;
    window.fontello_result  = result;
  }
};
