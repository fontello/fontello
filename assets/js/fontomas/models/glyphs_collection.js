/*global Fontomas, _, Backbone*/

;(function () {
  "use strict";


  Fontomas.models.glyphs_collection = Backbone.Collection.extend({
    model:            Fontomas.models.glyph,
    unicode_use_map:  [],


    initialize: function () {
      Fontomas.logger.debug("models.glyphs_collection.initialize");

      var code;

      for (code = 32; code <= 126; code++) {
        this.unicode_use_map.push({code: code, is_used: false});
      }
    },


    add: function (glyph, options) {
      Fontomas.logger.debug("models.glyphs_collection.add");

      var found_code;

      found_code = _.find(this.unicode_use_map, function (item) {
        return item.is_used === false;
      });

      if (!found_code) {
        Fontomas.logger.debug("models.glyphs_collection.add: no room to add glyph");
        return;
      }

      glyph.unicode_code  = found_code.code;
      found_code.is_used  = true;

      Backbone.Collection.prototype.add.call(this, glyph, options);
    },


    remove: function (model, options) {
      Fontomas.logger.debug("models.glyphs_collection.remove");

      var found_code,
          code = model.get("unicode_code");

      if (code) {
        found_code = _.find(this.unicode_use_map, function (item) {
          return item.code === code && item.is_used === true;
        });

        if (!found_code) {
          Fontomas.logger.error("models.glyphs_collection.remove: unicode_code not found in unicode_use_map");
          return;
        }

        found_code.is_used = false;
      }

      Backbone.Collection.prototype.remove.call(this, model, options);
    }
  });

}());
