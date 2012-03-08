var Fontomas = (function (Backbone, Fontomas) {
  "use strict";

  Fontomas.app.collections.Glyph = Backbone.Collection.extend({
    model: Fontomas.app.models.Glyph
  });

  return Fontomas;
}(window.Backbone, Fontomas || {}));
