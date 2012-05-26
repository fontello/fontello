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
  nodeca.runtime.faye.subscribe('/stats/users_online', function (count) {
    $users_count.text(count);
  });


  //
  // Fontname
  //


  var $fontname = $('#result-fontname');


  $fontname.on('keyup change', function () {
    var $el = $(this);
    $el.val($el.val().replace(/[^a-z0-9\-_]+/g, ''));
  });


  //
  // Sessions
  //


  var skip_session_save = false;


  function save_session(session) {
    session.set('fontname', $fontname.val());
    session.readFrom(fonts);
    session.save();
  }

  function load_session(session) {
    skip_session_save = true;

    $fontname.val(session.get('fontname'));
    session.seedInto(fonts);

    skip_session_save = false;
  }


  var save_current_state = _.debounce(function () {
    if (skip_session_save) {
      return;
    }

    save_session(nodeca.client.fontomas.sessions.at(0));
  }, 5000);


  // save current state upon fontname change
  $fontname.change(save_current_state);


  // change current state when some of glyph properties were changed
  fonts.each(function (f) {
    f.on('before:batch-select', function () {
      skip_session_save = true;
    });

    f.on('after:batch-select', function () {
      skip_session_save = false;
      save_current_state();
    });

    f.eachGlyph(function (g) {
      g.on('change:selected change:code change:css', save_current_state);
    });
  });


  load_session(nodeca.client.fontomas.sessions.at(0));


  if ('development' === nodeca.runtime.env) {
    // export some internal collections for debugging
    window.fontello_fonts   = fonts;
    window.fontello_result  = result;
  }
};
