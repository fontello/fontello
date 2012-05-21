/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

module.exports = Backbone.Collection.extend({
  used_codes: {},
  used_css:   {},


  add: function (models, options) {
    // FIXME: this seems to be buggy - we need to leave only "valid" glyphs
    //        to pass to the original add function of Backbone. _.filter
    //        should be used instead.
    _.each(_.isArray(models) ? models.slice() : [models], function (model) {
      var code = model.get('source_glyph').code,
          css  = model.get('source_glyph').css || 'unknown';

      // css already taken
      if (this.used_css[css]) {
        css = this._getFreeCss(css);
      }

      // code is already taken
      if (this.used_codes[code]) {
        code = this._getFreeCode();

        // no more free codes
        if (null === code) {
          // this should never happen in real life.
          nodeca.client.fontomas.util.notify('error',
            "Internal Error. Can't allocate code for glyph.");
          return;
        }
      }

      // lock the css & code
      this.used_css[css]    = true;
      this.used_codes[code] = true;

      model.set('css', css);
      model.set('unicode_code', code);
      model.on('change:unicode_code', this.onChangeGlyphCode, this);
    }, this);

    return Backbone.Collection.prototype.add.apply(this, arguments);
  },


  remove: function (models, options) {
    _.each(_.isArray(models) ? models.slice() : [models], function (model) {
      var code = model.get('unicode_code'), css = model.get('css');

      if (!this.used_codes[code]) {
        // this should never happen in real life.
        nodeca.client.fontomas.logger.error(
          "models.glyphs_collection.remove: code <" + code + "> " +
          "not found in used_codes map"
        );
        return;
      }

      // unlock the css & code
      this.used_css[css]    = false;
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
    var code = nodeca.config.fontomas.autoguess_charcode.min;

    while (code <= nodeca.config.fontomas.autoguess_charcode.max) {
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
  },

  _getFreeCss: function (css) {
    var i = 1, tmp;

    do {
      tmp = css + '-' + i;
      i++;
    } while (!!this.used_css[tmp]);

    return tmp;
  }
});
