/*global fontomas, _, Backbone*/

;(function () {
  "use strict";


  var findGlyphByUnicode = function (collection, unicode_code) {
    return _.find(collection, function (item) {
      return item.get("unicode_code") === unicode_code;
    });
  };


  fontomas.models.glyphs_collection = Backbone.Collection.extend({
    used_codes: {},
    free_codes: [],


    initialize: function () {
      var code;

      // initial (and reasonable) list of free codes.
      // list is exapandible on demand. see:  _take/_free
      for (code = 32; code <= 126; code++) {
        this.free_codes.push(code);
      }
    },


    add: function (glyph, options) {
      var unicode_code,
          orig_unicode = glyph.get("source_glyph").unicode_code;

      if (!this.used_codes[orig_unicode]) {
        unicode_code = this._take(orig_unicode);
      } else {
        if (!this.free_codes.length) {
          fontomas.logger.debug("models.glyphs_collection.add: no room to add glyph");
          return;
        }

        unicode_code = this._take(this.free_codes[0]);
      }

      glyph.set("unicode_code", unicode_code);
      glyph.on("change:unicode_code", this.onChangeGlyphCode, this);

      glyph.on('remove', function (glyph) {
        var code = glyph.get("unicode_code");

        if (!this.used_codes[code]) {
          fontomas.logger.error(
            "models.glyphs_collection.remove: code <" + code + "> " +
            "not found in used_codes map"
          );
          return;
        }

        this._free(code);
      }, this);

      Backbone.Collection.prototype.add.call(this, glyph, options);
    },


    // release/overtake new code by glyph
    // swaps glyphs if new code is already taken.
    onChangeGlyphCode: function (model, new_code) {
      var found_glyph,
          models,
          old_code = model.previous("unicode_code");

      // select all the models except one has been changed
      models = _.select(this.models, function (item) {
        return item !== model;
      });
      found_glyph = findGlyphByUnicode(models, new_code);

      if (found_glyph) {
        // if the model's unicode_code has changed to already used one
        // then we should swap glyph codes
        found_glyph.set("unicode_code", old_code);
      } else {
        found_glyph = findGlyphByUnicode(this.models, old_code);

        // if old_code is not used any more, we should free it
        if (this.used_codes[old_code] && !found_glyph) {
          this._free(old_code);
        }

        this._take(new_code);
      }
    },


    _take: function (code) {
      this.used_codes[code] = true;
      this.free_codes = _.without(this.free_codes, code);
      return code;
    },


    _free: function (code) {
      this.used_codes[code] = false;
      this.free_codes.unshift(code);
      this.free_codes = _.sortBy(this.free_codes, function (v) { return v; });
    }

  });

}());
