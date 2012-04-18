/*global nodeca, _, $, Modernizr*/

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

    // KLUDGE: should be replaced with selector.addFont() in future
    selector.addEmbeddedFonts(nodeca.client.fontomas.embedded_fonts);

    //
    // show selector tab after  load complete
    steps.activate('#selector');

    // Attach tooltip handler to matching elements
    $('.tooltip-enabled').tooltip();

    // Attach collapse handler to matching elements
    $('._collapser').ndCollapser();
  });
}());
