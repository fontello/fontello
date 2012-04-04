/*global fontomas, _, $, Modernizr*/

;(function () {
  "use strict";


  $(function () {
    var steps_view, result_view, selector_view, result_font;

    // check browser's capabilities
    if (!Modernizr.fontface) {
      fontomas.logger.error("bad browser");
      $('#err-bad-browser').modal({backdrop: 'static', keyboard: false});
      return;
    }

    result_font   = new fontomas.models.result_font();

    result_view   = new fontomas.ui.wizard.result.pane({model: result_font});
    selector_view = new fontomas.ui.wizard.selector.pane();
    steps_view    = new fontomas.ui.wizard.steps();


    // update glypsh count on wizard steps tab
    result_font.on('change:glyphs_count', function (model, count) {
      steps_view.setGlyphsCount(count);
    });


    selector_view.on('glyph-click', function (data) {
      var glyph = result_font.getGlyph(data.font_id, data.glyph_id);

      if (glyph) {
        glyph.destroy();
        return;
      }

      result_font.addGlyph(data);
    });

    // handle font close
    selector_view.on('font-close', function (font_id) {
      result_font.removeGlyphsByFont(font_id);
    });


    // KLUDGE: this will be removed soon
    selector_view.render();

    // show selector tab after load complete
    steps_view.activate('#selector');

    // Attach tooltip handler to matching elements
    $('.tooltip-enabled').tooltip();
  });

}());
