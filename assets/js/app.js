/*global fontomas, $, Modernizr*/

;(function () {
  "use strict";


  $(function () {
    // check browser's capabilities
    if (!Modernizr.fontface) {
      fontomas.logger.error("bad browser");
      $('#err-bad-browser').modal({backdrop: 'static', keyboard: false});
      return;
    }

    // Init & render application interface
    (new fontomas.ui.wizard.selector.pane()).render();

    // Attach tooltip handler to matching elements
    $('.tooltip-enabled').tooltip();
  });

}());
