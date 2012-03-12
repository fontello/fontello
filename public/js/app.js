(function ($, Fontomas) {
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
    //  console.log("bad browser");
    //  $(Fontomas.cfg.id.bad_browser).modal({keyboard: false});
    //  return;
    //}

    // show loading tab
    $(Fontomas.cfg.id.tab).tab("show");

    // main model
    Fontomas.main = new Fontomas.models.Main;
    // main view
    Fontomas.mainview = new Fontomas.views.Main({
      model: Fontomas.main
    });

    Fontomas.mainview.render();

    $('.tooltip-test').tooltip();
    $("#notifications-container").notify({speed: 500, expires: 5000});
  });
}(jQuery, window.Fontomas));
