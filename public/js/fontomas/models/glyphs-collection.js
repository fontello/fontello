var Fontomas = (function (Backbone, Fontomas) {
  "use strict";


  Fontomas.models.GlyphsCollection = Backbone.Collection.extend({
    model: Fontomas.models.Glyph
  });


  return Fontomas;
}(window.Backbone, Fontomas || {}));
