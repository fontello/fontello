/*global Fontomas, _, Backbone*/

;(function () {
  "use strict";


  Fontomas.models.GlyphsCollection = Backbone.Collection.extend({
    model:            Fontomas.models.Glyph,
    unicode_use_map:  [],


    initialize: function () {
      var code;

      Fontomas.logger.debug("models.GlyphsCollection.initialize");

      for (code = 32; code <= 126; code++) {
        this.unicode_use_map.push({code: code, is_used: false});
      }
    },


    add: function (glyph, options) {
      var found_code, char;

      Fontomas.logger.debug("models.GlyphsCollection.add");

      if (!glyph.unicode) {
        found_code = _.find(this.unicode_use_map, function (item) {
          return item.is_used === false;
        });

        if (!found_code) {
          Fontomas.logger.debug("models.GlyphsCollection.add: no room to add glyph");
          return;
        }

        glyph.unicode       = found_code.code;
        found_code.is_used  = true;
      }

      char          = String.fromCharCode(glyph.unicode);
      glyph.top     = glyph.unicode === 32 ? "space" : char;
      glyph.bottom  = this.toUnicode(char);
      glyph.char    = this.toCharRef(char);

      Backbone.Collection.prototype.add.call(this, glyph, options);
    },


    remove: function (model, options) {
      var found_code,
        unicode = model.get("unicode");

      Fontomas.logger.debug("models.GlyphsCollection.remove");

      if (unicode) {
        found_code = _.find(this.unicode_use_map, function (item) {
          return item.code === unicode && item.is_used === true;
        });

        if (!found_code) {
          Fontomas.logger.error("models.GlyphsCollection.remove: glyph.unicode not found in unicode_use_map");
          return;
        }

        found_code.is_used = false;
      }

      Backbone.Collection.prototype.remove.call(this, model, options);
    },


    // return char in CharRef notation
    toCharRef: function (char) {
      return "&#x" + char.charCodeAt(0).toString(16) + ";";
    },


    // return char in U+ notation
    toUnicode: function (char) {
      var c = char.charCodeAt(0).toString(16).toUpperCase();
      return "U+" + "0000".substr(0, 4 - c.length % 4) + c;
    }
  });

}());
