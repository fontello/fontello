var Fontomas = (function (Backbone, Fontomas) {
  "use strict";

  Fontomas.models.Main = Backbone.Model.extend({
    fonts:        new Fontomas.collections.Font,
    genfont:      new Fontomas.models.GeneratedFont,
    next_font_id: 1,
    xml_template: null,
    myfiles:      []
  });

  return Fontomas;
}(window.Backbone, Fontomas || {}));
