/*global nodeca, _, $, Modernizr*/

//= require jquery/jquery
//= require jquery.noty/src/js/jquery.noty
//= require bootstrap/bootstrap
//= require underscore
//= require backbone
//= require handlebars
//= require jquery.collapser
//= require nodeca
//= require fontomas/api

;(function () {
  "use strict";

  $(function () {
    var steps, selector, preview, result, result_font;

    // check browser's capabilities
    if (!Modernizr.fontface) {
      nodeca.client.fontomas.logger.error("bad browser");
      $('#err-bad-browser').modal({backdrop: 'static', keyboard: false});
      return;
    }

    result_font   = new nodeca.client.fontomas.models.result_font();

    steps     = new nodeca.client.fontomas.ui.wizard.steps();
    selector  = new nodeca.client.fontomas.ui.wizard.selector.pane();
    preview   = new nodeca.client.fontomas.ui.wizard.preview.pane({model: result_font});
    result    = new nodeca.client.fontomas.ui.wizard.result.pane({model: result_font});


    // update glypsh count on wizard steps tab
    result_font.glyphs.on('add remove', function () {
      steps.setGlyphsCount(result_font.glyphs.length);
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
    steps.activate('#selector');

    // Attach tooltip handler to matching elements
    $('._tip').tooltip();

    // Attach collapse handler to matching elements
    $('._collapser').ndCollapser();

    // live update of amount of online clients
    var $users_count = $('#stats-online');
    nodeca.runtime.sio.on('users_online', function (count) {
      $users_count.text(count);
    });
  });
}());
