var Fontomas = (function (Backbone, Fontomas) {
  "use strict";

  Fontomas.app.models.Glyph = Backbone.Model.extend({
    // FIXME: the model isn't sync()ed to server yet
    sync: function () {
      console.log("app.models.Font.sync()");
    }
  });

  return Fontomas;
}(window.Backbone, Fontomas || {}));
