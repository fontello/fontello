/*global fontomas, $, Backbone, Modernizr*/

;(function () {
  "use strict";


  $(function () {
    // check browser's capabilities
    if (!Modernizr.fontface) {
      fontomas.logger.error("bad browser");
      $('#fm-bad-browser').modal({keyboard: false});
      return;
    }

    // show loading tab
    $('#tab').tab("show");

    // main view
    var view = new fontomas.ui.app;
    view.render();

    // Attach tooltip handler to matching elements
    $('.tooltip-test').tooltip();
  });

}());
