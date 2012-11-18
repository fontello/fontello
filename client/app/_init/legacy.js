/*global nodeca, _, $, Modernizr, Backbone, window, Faye*/


"use strict";


module.exports = function () {
  var
    // jQuery $elements
    $fontname, $users_count, $glyphs, $import,
    // models
    fonts, result, session,
    // ui views
    toolbar, tabs, preview, editor;

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
    model: nodeca.client.models.font
  }))(require('../../../shared/embedded_fonts'));

  // special collection of selected glyphs (cache) with
  // extra model logic (validate, config creation and
  // download requesting), but which can still be used
  // as a normal collection for the views
  result = new nodeca.client.models.result;


  //
  // Views (UI)
  //


  toolbar   = new nodeca.client.ui.toolbar;
  tabs      = new nodeca.client.ui.tabs;
  preview   = new nodeca.client.ui.panes.preview({model: result});
  editor    = new nodeca.client.ui.panes.codes_editor({model: result});


  //
  // Initialization
  //


  fonts.each(function (f) {
    f.eachGlyph(function (g) {
      toolbar.addKeywords(g.get('source').search || []);
      g.on('change:selected', function (g, val) {
        result[val ? 'add' : 'remove'](g);
      });
    });
  });


  toolbar.on('click:download', function () {
    result.startDownload($('#result-fontname').val());
  });


  toolbar.on('change:glyph-size', _.debounce(function (size) {
    nodeca.trigger('font-size:change', [size]);
    preview.changeGlyphSize(size);
  }, 250));


  $('#glyph-3d').change(function () {
    var val = 'checked' === $(this).attr('checked');
    nodeca.trigger('3d-mode:change', [val]);
    preview.$el.toggleClass('_3d', val);
  }).trigger('change');


  // perform glyphs search
  $glyphs = $('.glyph');
  toolbar.on('change:search', function (q) {
    q = $.trim(q);

    if (0 === q.length) {
      $glyphs.show();
      return;
    }

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
  // Fontname
  //


  $fontname = $('#result-fontname');
  $fontname.on('keyup change', function () {
    var $el = $(this);
    $el.val($el.val().replace(/[^a-z0-9\-_]+/g, ''));
  });


  //
  // Sessions
  //


  // Session manager instance
  session = new nodeca.client.sessions({
    fontnameElement:  $fontname,
    fontsList:        fonts
  });


  var save_session = _.debounce(function () {
    session.save();
  }, 2000);


  // save current state upon fontname change
  $fontname.change(save_session);


  // change current state when some of glyph properties were changed
  fonts.each(function (f) {
    f.on('before:batch-select', function () {
      nodeca.client.sessions.disable();
    });

    f.on('after:batch-select', function () {
      nodeca.client.sessions.enable();
      save_session();
    });

    f.eachGlyph(function (g) {
      g.on('change:selected change:code change:css', save_session);
    });
  });


  session.load();


  //
  // Initialize clear (selections) button
  //


  $('#reset-app-selections').click(function (event) {
    // do not change location
    event.preventDefault();

    fonts.each(function (f) {
      f.eachGlyph(function (g) {
        g.toggle('selected', false);
      });
    });

    save_session();
  });


  //
  // Initialize reset everything button
  //


  $('#reset-app-all').click(function (event) {
    // do not change location
    event.preventDefault();

    fonts.each(function (f) {
      f.eachGlyph(function (g) {
        g.toggle('selected', false);
        g.unset('code');
        g.unset('css');
      });
    });

    $fontname.val('');
    save_session();
  });


  if ('development' === nodeca.runtime.env) {
    // export some internal collections for debugging
    window.fontello_fonts   = fonts;
    window.fontello_result  = result;
  }


  //
  // Initialize config reader
  //


  $import = $('#import-app-config');

  $import.click(function (event) {
    event.preventDefault();

    if (!window.FileReader) {
      nodeca.trigger('notification', [
        'error', nodeca.runtime.t('errors.no_file_reader')
      ]);
      return false;
    }

    $('#import-app-config-file').click();
    return false;
  });

  // handle file upload
  $('#import-app-config-file').change(function (event) {
    var file = (event.target.files || [])[0], reader;

    nodeca.logger.debug('Import config requested', file);

    // file.type is empty on Chromium, so we allow upload anything
    // and will get real error only if JSON.parse fails

    if (!file) {
      // Unexpected behavior. Should not happen in real life.
      nodeca.trigger('notification', [
        'error', nodeca.runtime.t('errors.no_config_hosen')
      ]);
      return;
    }

    // we must "reset" value of input field, otherwise Chromium will
    // not fire change event if the same file will be chosen twice, e.g.
    // import config -> made changes -> import config

    $(this).val('');

    reader = new window.FileReader();

    reader.onload = function (event) {
      var config;

      try {
        config = JSON.parse(event.target.result);
      } catch (err) {
        nodeca.trigger('notification', [
          'error', nodeca.runtime.t('errors.read_config', {
            error: (err.message || err.toString())
          })
        ]);
        return;
      }

      nodeca.logger.debug('Config successfully parsed', config);
      session.readConfig(config);
    };

    reader.readAsBinaryString(file);
  });
};
