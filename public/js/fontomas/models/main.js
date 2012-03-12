var Fontomas = (function (Backbone, Fontomas) {
  "use strict";

  Fontomas.models.Main = Backbone.Model.extend({
    fonts:        new Fontomas.models.FontsCollection,
    genfont:      new Fontomas.models.GeneratedFont,
    next_font_id: 1,
    xml_template: null,
    myfiles:      []
  });

  return Fontomas;
}(window.Backbone, Fontomas || {}));
