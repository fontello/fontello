/*global Fontomas, Backbone*/

;(function () {
  "use strict";


  Fontomas.models.GlyphsCollection = Backbone.Collection.extend({
    model: Fontomas.models.Glyph
  });

}());
