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


  //
  // Initialize clear button
  //


  function reset_app(scope) {
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
  }


  $('#reset-app-selections').click(function (event) {
    // do not change location
    event.preventDefault();
    reset_app('selections');
  });


  $('#reset-app-all').click(function (event) {
    // do not change location
    event.preventDefault();
    reset_app('all');
  });


  //
  // live update of amount of online clients
  //


  var $users_count = $('#stats-online');
  nodeca.runtime.sio.on('users_online', function (count) {
    $users_count.text(count);
  });


  //
  // Sessions
  //


  // Dummy colection that saves itself into localStorage
  var sessions = new nodeca.client.fontomas.models.sessions;


  // Serialization spec version
  var SERIALIZER_VERSION = 1;



  // data of each session is:
  //
  //  version:      (Number)  version of serilalization
  //  name:         (String)  fontname of the preset
  //  fonts:        (Object)  configuration of fonts
  //    collapsed:  (Boolean) whenever font is collapsed or not
  //    glyphs:     (Array)   list of modified and/or selected glyphs
  //      - uid:        (String) Glyph unique id
  //      - orig_code:  (Number) Glyph original (from the font source) code
  //      - code:       (Number) User defined code
  //      - css:        (String) User defined css name
  //      - svg:        (String)


  function load_session(session) {
    var data = session.get('data');

    if (!data) {
      return;
    }

    if (data.version !== SERIALIZER_VERSION) {
      session.destroy();
      nodeca.client.fontomas.util.notify('alert',
        'Session was saved with an older version, so it cannot be loaded.');
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
        var glyph = font.getGlyph({
          uid:  glyph_data.uid,
          code: glyph_data.orig_code,
          css:  glyph_data.orig_css
        });

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

  function save_session(session) {
    var data = {
      version:  SERIALIZER_VERSION,
      name:     $('#result-fontname').val(),
      fonts:    {}
    };

    fonts.each(function (f) {
      var font_data = data.fonts[f.get('id')] = {
        collapsed:  f.get('collapsed'),
        glyphs:     []
      };

      f.eachGlyph(function (g) {
        // save only selected and/or modified glyphs to
        // reduce amount of used space in the storage
        if (g.get('selected') || g.isModified()) {
          font_data.glyphs.push({
            uid:        g.get('uid'),
            orig_code:  g.get('source').code,
            orig_css:   g.get('source').css,
            selected:   g.get('selected'),
            code:       g.get('code'),
            css:        g.get('css')
          });
        }
      });
    });

    session.set('data', data).save();
  }


  var save_current_state = _.throttle(function () {
    save_session(sessions.at(0));
  }, 1000);


  // save current state upon fontname change
  $('#result-fontname').change(save_current_state);


  // change current state when some of glyph properties were changed
  fonts.each(function (f) {
    f.eachGlyph(function (g) {
      g.on('change:selected change:code change:css', save_current_state);
    });
  });


  load_session(sessions.at(0));


  if ('development' === nodeca.runtime.env) {
    // export some internal collections for debugging
    window.fontello_fonts   = fonts;
    window.fontello_result  = result;
  }
};
