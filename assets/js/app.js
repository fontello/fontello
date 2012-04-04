/*global fontomas, _, $, Modernizr*/

;(function () {
  "use strict";


  $(function () {
    var steps, result, selector, result_font;

    // check browser's capabilities
    if (!Modernizr.fontface) {
      fontomas.logger.error("bad browser");
      $('#err-bad-browser').modal({backdrop: 'static', keyboard: false});
      return;
    }

    result_font   = new fontomas.models.result_font();

    steps     = new fontomas.ui.wizard.steps();
    selector  = new fontomas.ui.wizard.selector.pane();
    result    = new fontomas.ui.wizard.result.pane({model: result_font});


    // update glypsh count on wizard steps tab
    result_font.on('change:glyphs_count', function (model, count) {
      steps.setGlyphsCount(count);
    });


    selector.on('glyph-click', function (data) {
      var glyph = result_font.getGlyph(data.font_id, data.glyph_id);

      if (glyph) {
        glyph.destroy();
        return;
      }

      result_font.addGlyph(data);
    });

    // handle font close
    selector.on('font-close', function (font_id) {
      result_font.removeGlyphsByFont(font_id);
    });


    // KLUDGE: should be replaced with selector.addFont() in future
    selector.addEmbeddedFonts(fontomas.embedded_fonts);

    // show selector tab after load complete
    steps.activate('#selector');

    // Attach tooltip handler to matching elements
    $('.tooltip-enabled').tooltip();
  });

}());
