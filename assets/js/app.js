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

    result_font = new fontomas.models.result_font();

    result_view = new fontomas.ui.wizard.result.pane({model: result_font});
    steps_view  = new fontomas.ui.wizard.steps();

    result_font.on('change:glyph_count', function (model, count) {
      steps_view.setGlyphsCount(count);
    }, this);

    // KLUDGE: this will be removed soon
    // Init & render application interface
    (new fontomas.ui.wizard.selector.pane({
      resultfontview: result_view
    })).render();

    // show selector tab after load complete
    steps_view.activate('#selector');

    // Attach tooltip handler to matching elements
    $('.tooltip-enabled').tooltip();
  });

}());
