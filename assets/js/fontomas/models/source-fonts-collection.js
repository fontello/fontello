/*global Fontomas, Backbone*/

;(function () {
  "use strict";


  Fontomas.models.FontsCollection = Backbone.Collection.extend({
    model: Fontomas.models.Font
  });

}());
