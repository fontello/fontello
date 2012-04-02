/*global fontomas, $, Backbone, Modernizr*/

;(function () {
  "use strict";


  $(function () {
    // FF3.6+ Chrome6+ Opera11.1+
    fontomas.env.filereader = !!window.FileReader;

    fontomas.env.fontface = Modernizr.fontface;

    // check browser's capabilities
    if (!fontomas.env.fontface) {
      fontomas.logger.error("bad browser");
      $('#fm-bad-browser').modal({keyboard: false});
      return;
    }

    // show loading tab
    $('#tab').tab("show");

    // main view
    var view = new fontomas.ui.app;
    view.render();

    $('.tooltip-test').tooltip();
    $("#notifications-container").notify({speed: 500, expires: 5000});
  });

}());
