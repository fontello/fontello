/*global fontomas, Backbone*/

;(function () {
  "use strict";


  fontomas.models.glyph = Backbone.Model.extend({
    // FIXME: the model isn't sync()ed to server yet
    sync: function () {
      fontomas.logger.debug("models.glyph.sync()");
    }
  });

}());
