/*global Fontomas, $, Backbone*/

(function (Fontomas) {
  "use strict";

  $(function () {
    // FF3.6+ Chrome6+ Opera11.1+
    Fontomas.env.filereader = !!window.FileReader;

    // debug: simulate no filereader is available
    if (Fontomas.debug.is_on && Fontomas.debug.nofilereader) {
      Fontomas.env.filereader = false;
    }

    // check browser's capabilities
    //if ([> check if browser is OK <]) {
    //  Fontomas.logger.error("bad browser");
    //  $('#fm-bad-browser').modal({keyboard: false});
    //  return;
    //}

    // show loading tab
    $('#tab').tab("show");

    // main model
    Fontomas.main = new (Backbone.Model.extend({
      fonts:        new Fontomas.models.FontsCollection,
      genfont:      new Fontomas.models.GeneratedFont,
      next_font_id: 1,
      xml_template: null,
      myfiles:      []
    }));

    // main view
    Fontomas.mainview = new Fontomas.views.app({
      model: Fontomas.main
    });

    Fontomas.mainview.render();

    $('.tooltip-test').tooltip();
    $("#notifications-container").notify({speed: 500, expires: 5000});
  });
}(Fontomas || {}));
