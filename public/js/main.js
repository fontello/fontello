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
    Fontomas.app.main = new Fontomas.app.models.Main;
    // main view
    Fontomas.app.mainview = new Fontomas.app.views.Main({
      model: Fontomas.app.main
    });

    Fontomas.app.mainview.render();
  });
}(jQuery, window.Fontomas));
