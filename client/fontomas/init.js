/*global nodeca, _, $, Modernizr*/

"use strict";

module.exports = function () {
  var toolbar, tabs, selector, preview, editor, result_font, $glyphs;

  // check browser's capabilities
  if (!Modernizr.fontface) {
    nodeca.client.fontomas.logger.error("bad browser");
    $('#err-bad-browser').modal({backdrop: 'static', keyboard: false});
    return;
  }

  result_font   = new nodeca.client.fontomas.models.result_font();

  toolbar   = new nodeca.client.fontomas.ui.toolbar();
  tabs      = new nodeca.client.fontomas.ui.tabs();

  selector  = new nodeca.client.fontomas.ui.panes.selector();
  preview   = new nodeca.client.fontomas.ui.panes.preview({model: result_font});
  editor    = new nodeca.client.fontomas.ui.panes.codes_editor({model: result_font});


  toolbar.on('click:download', function () {
    result_font.startDownload();
  });


  toolbar.on('change:glyph-size', _.debounce(function (size) {
    selector.changeGlyphSize(size);
  }, 250));


  toolbar.on('change:search', _.debounce(function (query) {
    if (!$glyphs) {
      $glyphs = $('li.glyph');
    }

    selector.$el.stop(true).fadeTo('fast', 0, function () {
      var re = new RegExp(query || '', 'i');

      $glyphs.each(function () {
        var $this = $(this);
        $this.toggle(re.test($this.data('tags')));
      });

      selector.$el.fadeTo('fast', 1);
    });
  }, 250));


  // update glypsh count on wizard steps tab
  result_font.glyphs.on('add remove', function () {
    var count = result_font.glyphs.length;

    toolbar.setGlyphsCount(count);
    tabs.setGlyphsCount(count);
  });

  selector.on('click:glyph', function (data) {
    var glyph = result_font.getGlyph(data.font_id, data.glyph_id);

    if (glyph) {
      glyph.destroy();
      return;
    }

    result_font.addGlyph(data);
  });

  // init embedded fonts
  _.each(nodeca.shared.fontomas.embedded_fonts, function (config) {
    var model = new nodeca.client.fontomas.models.source_font(_.extend({}, config, {
      embedded_id: config.id
    }));

    selector.addFont(model);
  });

  //
  // show selector tab after  load complete
  tabs.activate('#selector');

  // Attach tooltip handler to matching elements
  $('._tip').tooltip();

  // Attach collapse handler to matching elements
  $('._collapser').ndCollapser();

  // live update of amount of online clients
  var $users_count = $('#stats-online');
  nodeca.runtime.sio.on('users_online', function (count) {
    $users_count.text(count);
  });
};
