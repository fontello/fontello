var Fontomas = (function (Backbone, Fontomas) {
  "use strict";

  Fontomas.collections.Glyph = Backbone.Collection.extend({
    model: Fontomas.models.Glyph
  });

  return Fontomas;
}(window.Backbone, Fontomas || {}));
