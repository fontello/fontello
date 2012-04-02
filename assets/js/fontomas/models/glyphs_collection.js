/*global fontomas, _, Backbone*/

;(function () {
  "use strict";


  fontomas.models.glyphs_collection = Backbone.Collection.extend({
    unicode_use_map: [],


    initialize: function () {
      var code;

      for (code = 32; code <= 126; code++) {
        this.unicode_use_map.push({code: code, is_used: false});
      }
    },


    add: function (glyph, options) {
      var found_code,
          orig_unicode = glyph.get("source_glyph").unicode_code;

      found_code = _.find(this.unicode_use_map, function (item) {
        return item.code === orig_unicode;
      });

      if (!found_code) {
        this.unicode_use_map.push({code: orig_unicode, is_used: false});
      }

      found_code = _.find(this.unicode_use_map, function (item) {
        return item.code === orig_unicode && item.is_used === false;
      });

      if (!found_code) {
        found_code = _.find(this.unicode_use_map, function (item) {
          return item.is_used === false;
        });
      }

      if (!found_code) {
        fontomas.logger.debug("models.glyphs_collection.add: no room to add glyph");
        return;
      }

      glyph.set("unicode_code", found_code.code);
      found_code.is_used  = true;

      glyph.on("change:unicode_code", this.onChangeUnicodeCode, this);

      Backbone.Collection.prototype.add.call(this, glyph, options);
    },


    remove: function (model, options) {
      var found_code,
          code = model.get("unicode_code");

      if (code) {
        found_code = _.find(this.unicode_use_map, function (item) {
          return item.code === code && item.is_used === true;
        });

        if (!found_code) {
          fontomas.logger.error("models.glyphs_collection.remove: unicode_code not found in unicode_use_map");
          return;
        }

        found_code.is_used = false;
      }

      Backbone.Collection.prototype.remove.call(this, model, options);
    },


    onChangeUnicodeCode: function (model, new_code) {
      var found_code,
          found_glyph,
          old_code = model.previous("unicode_code");

      found_glyph = _.find(this.models, function (item) {
        return item !== model && item.get("unicode_code") === new_code;
      });

      if (found_glyph) {

        // swap glyphs
        found_glyph.set("unicode_code", old_code);

      } else {

        found_code = _.find(this.unicode_use_map, function (item) {
          return item.code === old_code;
        });

        found_glyph = _.find(this.models, function (item) {
          return item.get("unicode_code") === old_code;
        });

        if (found_code && !found_glyph) {
          found_code.is_used = false;
        }

        found_code = _.find(this.unicode_use_map, function (item) {
          return item.code === new_code;
        });

        if (found_code) {
          found_code.is_used = true;
        } else {
          this.unicode_use_map.push({code: new_code, is_used: true});
        }
      }
    }

  });

}());
