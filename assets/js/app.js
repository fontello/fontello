/*global fontomas, $, Backbone, Modernizr*/

;(function () {
  "use strict";


  $(function () {
    // FF3.6+ Chrome6+ Opera11.1+
    fontomas.env.filereader = !!window.FileReader;

    // debug: simulate no filereader is available
    if (fontomas.debug.is_on && fontomas.debug.nofilereader) {
      fontomas.env.filereader = false;
    }

    fontomas.env.fontface = Modernizr.fontface;

    // debug: simulate no fontface is available
    if (fontomas.debug.is_on && fontomas.debug.nofontface) {
      fontomas.env.fontface = false;
    }

    // check browser's capabilities
    if (!fontomas.env.fontface) {
      fontomas.logger.error("bad browser");
      $('#fm-bad-browser').modal({keyboard: false});
      return;
    }

    // show loading tab
    $('#tab').tab("show");

    // main view
    var view = new fontomas.views.app;
    view.render();

    $('.tooltip-test').tooltip();
    $("#notifications-container").notify({speed: 500, expires: 5000});
  });

}());
