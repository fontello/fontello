/*global nodeca, _, $, Modernizr, Backbone, window, Faye*/


"use strict";


module.exports = function () {
  var
    // jQuery $elements
    $fontname, $users_count, $glyphs,
    // models
    fonts, result, session,
    // ui views
    toolbar, tabs, selector, preview, editor;


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
    selector.changeGlyphSize(size);
  }, 250));


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
  });


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
  session = new nodeca.client.fontomas.sessions({
    fontnameElement:  $fontname,
    fontsList:        fonts
  });


  var save_session = _.debounce(function () {
    session.save();
  }, 5000);


  // save current state upon fontname change
  $fontname.change(save_session);


  // change current state when some of glyph properties were changed
  fonts.each(function (f) {
    f.on('before:batch-select', function () {
      nodeca.client.fontomas.sessions.disable();
    });

    f.on('after:batch-select', function () {
      nodeca.client.fontomas.sessions.enable();
      save_session();
    });

    f.eachGlyph(function (g) {
      g.on('change:selected change:code change:css', save_session);
    });
  });


  session.load();


  if ('development' === nodeca.runtime.env) {
    // export some internal collections for debugging
    window.fontello_fonts   = fonts;
    window.fontello_result  = result;
  }


  //
  // Initialize Faye
  //


  nodeca.io.init();


  //
  // live update of amount of online clients
  //


  $users_count = $('#stats-online');
  nodeca.io.on('/stats/users_online', function (count) {
    $users_count.text(count);
  });


  //
  // Social buttons
  //
  $(window).load(function() {

      // Google analytics

      (function() {
        var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
        ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
      })();

      // Twitter buttons

      !function(d,s,id) {
        var js, fjs = d.getElementsByTagName(s)[0];

        if (!d.getElementById(id)) {
          js = d.createElement(s);
          js.id = id;
          js.src = "//platform.twitter.com/widgets.js";

          fjs.parentNode.insertBefore(js,fjs);
        }
      }(document,"script","twitter-wjs");

      // Google +1

      (function() {
        var po = document.createElement('script');

        po.type = 'text/javascript';
        po.async = true;
        po.src = 'https://apis.google.com/js/plusone.js';

        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(po, s);
      })();

      // Flattr

      (function() {
        var s = document.createElement('script'), t = document.getElementsByTagName('script')[0];
        s.type = 'text/javascript';
        s.async = true;
        s.src = 'http://api.flattr.com/js/0.6/load.js?mode=auto';
        t.parentNode.insertBefore(s, t);
      })();

  });
};
