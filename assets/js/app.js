/*global fontomas, $, Backbone, Modernizr*/

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
    (new fontomas.ui.app()).render();

    // Attach tooltip handler to matching elements
    $('.tooltip-test').tooltip();
  });

}());
