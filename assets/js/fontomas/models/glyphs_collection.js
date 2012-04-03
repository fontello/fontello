/*global fontomas, _, Backbone*/

;(function () {
  "use strict";


  var takeCode = function (obj, code) {
    obj.unicode_used[code] = true;

    if (32 <= code && code <= 126) {
      obj.unicode_free = _.without(obj.unicode_free, code);
      // _.without() seems to maintain the sort order
      //obj.unicode_free = _.sortBy(obj.unicode_free, function (v) { return v; });
    }
  };


  var freeCode = function (obj, code) {
    delete obj.unicode_used[code];

    if (32 <= code && code <= 126) {
      obj.unicode_free.unshift(code);
      obj.unicode_free = _.sortBy(obj.unicode_free, function (v) { return v; });
    }
  };


  var findGlyphByUnicode = function (collection, unicode_code) {
    return _.find(collection, function (item) {
      return item.get("unicode_code") === unicode_code;
    });
  };


  fontomas.models.glyphs_collection = Backbone.Collection.extend({
    unicode_used: {},
    unicode_free: [],


    initialize: function () {
      var code;

      for (code = 32; code <= 126; code++) {
        this.unicode_free.push(code);
      }
    },


    add: function (glyph, options) {
      var unicode_code,
          orig_unicode = glyph.get("source_glyph").unicode_code;

      if (!this.unicode_used[orig_unicode]) {
        this.unicode_used[orig_unicode] = true;
        unicode_code = orig_unicode;
      } else {
        if (!this.unicode_free.length) {
          fontomas.logger.debug("models.glyphs_collection.add: no room to add glyph");
          return;
        }

        unicode_code = this.unicode_free.shift();
      }

      glyph.set("unicode_code", unicode_code);
      glyph.on("change:unicode_code", this.onChangeUnicodeCode, this);
      Backbone.Collection.prototype.add.call(this, glyph, options);
    },


    remove: function (model, options) {
      var unicode_code = model.get("unicode_code");

      if (!this.unicode_used[unicode_code]) {
        fontomas.logger.error("models.glyphs_collection.remove: unicode_code" +
                              " not found in unicode_use_map");
        return;
      }

      Backbone.Collection.prototype.remove.call(this, model, options);
      freeCode(this, unicode_code);
    },


    onChangeUnicodeCode: function (model, new_code) {
      var found_glyph,
          old_code = model.previous("unicode_code");

      found_glyph = findGlyphByUnicode(this.models, new_code);

      if (found_glyph && found_glyph !== model) {

        // swap glyphs
        found_glyph.set("unicode_code", old_code);

      } else {

        found_glyph = findGlyphByUnicode(this.models, old_code);

        if (this.unicode_used[old_code] && !found_glyph) {
          freeCode(this, old_code);
        }

        takeCode(this, new_code);
      }
    }

  });

}());
