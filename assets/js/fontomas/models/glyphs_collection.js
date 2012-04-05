/*global fontomas, _, Backbone*/

;(function () {
  "use strict";


  fontomas.models.glyphs_collection = Backbone.Collection.extend({
    used_codes: {},


    add: function (models, options) {
      _.each(_.isArray(models) ? models.slice() : [models], function (model) {
        var code = model.get('source_glyph').unicode_code;

        // code is already taken
        if (this.used_codes[code]) {
          code = this._getFreeCode();

          // no more free codes
          if (null === code) {
            fontomas.util.notify_alert("No more space for glyphs.");
            return;
          }
        }

        // lock the code
        this.used_codes[code] = true;

        model.set('unicode_code', code);
        model.on('change:unicode_code', this.onChangeGlyphCode, this);
      }, this);

      return Backbone.Collection.prototype.add.apply(this, arguments);
    },


    remove: function (models, options) {
      _.each(_.isArray(models) ? models.slice() : [models], function (model) {
        var code = model.get('unicode_code');

        if (!this.used_codes[code]) {
          fontomas.logger.error(
            "models.glyphs_collection.remove: code <" + code + "> " +
            "not found in used_codes map"
          );
          return;
        }

        // unlock the code
        this.used_codes[code] = false;
      }, this);

      return Backbone.Collection.prototype.remove.apply(this, arguments);
    },


    // release/overtake new code by glyph
    // swaps glyphs if new code is already taken.
    onChangeGlyphCode: function (model, new_code) {
      var conflict, old_code = model.previous('unicode_code');

      // conflicting glyph
      conflict = this.find(function (m) {
        return m !== model && m.get('unicode_code') === new_code;
      });

      if (conflict) {
        // this will never run an infinitive loop, because other model
        // is already updated, so there will be no conflict glyph for
        // this one.
        conflict.set('unicode_code', old_code);
        return;
      }

      this.used_codes[new_code] = true;
      this.used_codes[old_code] = !!this.find(function (model) {
        return old_code === model.get('unicode_code');
      });
    },


    _getFreeCode: function () {
      var code = fontomas.config.code_autoguess_range[0];

      while (code < fontomas.config.code_autoguess_range[1]) {
        if (!this.used_codes[code]) {
          // got unused code
          return code;
        }

        // try next code
        code += 1;
      }

      // can't find empty code.
      // should never happen in real life.
      return null;
    }
  });

}());
