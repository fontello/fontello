/*global Backbone*/

var Fontomas = (function (Fontomas) {
  "use strict";


  Fontomas.models.GlyphsCollection = Backbone.Collection.extend({
    model: Fontomas.models.Glyph
  });


  return Fontomas;
}(Fontomas || {}));
