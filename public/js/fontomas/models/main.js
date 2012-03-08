var Fontomas = (function (Backbone, Fontomas) {
  "use strict";

  Fontomas.app.models.Main = Backbone.Model.extend({
    fonts:        new Fontomas.app.collections.Font,
    genfont:      new Fontomas.app.models.GeneratedFont,
    next_font_id: 1,
    xml_template: null,
    myfiles:      []
  });

  return Fontomas;
}(window.Backbone, Fontomas || {}));
