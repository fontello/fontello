/*global Fontomas, Backbone*/

;(function () {
  "use strict";


  Fontomas.models.source_fonts_collection = Backbone.Collection.extend({
    model: Fontomas.models.source_font
  });

}());
