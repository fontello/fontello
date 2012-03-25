/*global Fontomas, $, Backbone, Modernizr*/

;(function () {
  "use strict";


  $(function () {
    // FF3.6+ Chrome6+ Opera11.1+
    Fontomas.env.filereader = !!window.FileReader;

    // debug: simulate no filereader is available
    if (Fontomas.debug.is_on && Fontomas.debug.nofilereader) {
      Fontomas.env.filereader = false;
    }

    Fontomas.env.fontface = Modernizr.fontface;

    // debug: simulate no fontface is available
    if (Fontomas.debug.is_on && Fontomas.debug.nofontface) {
      Fontomas.env.fontface = false;
    }

    // check browser's capabilities
    if (!Fontomas.env.fontface) {
      Fontomas.logger.error("bad browser");
      $('#fm-bad-browser').modal({keyboard: false});
      return;
    }

    // show loading tab
    $('#tab').tab("show");

    // main view
    var view = new Fontomas.views.app;
    view.render();

    $('.tooltip-test').tooltip();
    $("#notifications-container").notify({speed: 500, expires: 5000});
  });

}());
