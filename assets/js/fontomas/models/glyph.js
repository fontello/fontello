/*global Fontomas, Backbone*/

;(function () {
  "use strict";


  Fontomas.models.Glyph = Backbone.Model.extend({
    // FIXME: the model isn't sync()ed to server yet
    sync: function () {
      Fontomas.logger.debug("models.Glyph.sync()");
    }
  });

}());
