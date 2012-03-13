var Fontomas = (function (Backbone, Fontomas) {
  "use strict";


  Fontomas.models.Glyph = Backbone.Model.extend({
    // FIXME: the model isn't sync()ed to server yet
    sync: function () {
      Fontomas.logger.debug("models.Glyph.sync()");
    }
  });


  return Fontomas;
}(window.Backbone, Fontomas || {}));
