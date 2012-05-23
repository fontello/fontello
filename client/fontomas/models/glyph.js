/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


// SEE: http://www.unicode.org/versions/Unicode6.0.0/ch02.pdf
//
// In the Unicode Standard, the codespace consists of the integers
// from 0 to 10FFFF16, comprising 1,114,112 code points available for
// assigning the repertoire of abstract characters.
// ...
// Noncharacters. Sixty-six code points are not used to encode characters.
// Noncharacters consist of U+FDD0..U+FDEF and any code point ending in the
// value FFFE16 or FFFF16- that is, U+FFFE, U+FFFF, U+1FFFE, U+1FFFF, ...
// U+10FFFE, U+10FFFF.
function is_valid_code(code) {
    var valid = (0 <= code && code <= 0x10ffff);

    valid = (valid && (0xfdd0 > code || code > 0xfdef));
    valid = (valid && code % 0x10000 !== 0xfffe);
    valid = (valid && code % 0x10000 !== 0xffff);

    return valid;
}


// resets (from source) `name` attribute, if it was provided as null
function preprocess_attribute(source, attrs, name, options) {
  if (null === attrs[name]) {
    attrs[name] = source[name];
    // `options = {unset: true}` when `#unset()`
    delete options.unset;
  }
}


module.exports = Backbone.Model.extend({
  defaults: function () {
    return {
      font      : null,
      source    : null,
      code      : null,
      css       : null,
      selected  : false
    };
  },


  idAttribute: 'uid',


  initialize: function (attributes) {
    var tags = (attributes.source || {}).search || attributes.search || [];
    this.keywords = tags.join(' ');
  },


  set: function(key, value, options) {
    var attrs, attr, val, source;

    if (_.isObject(key) || null === key) {
      attrs = key;
      options = value;
    } else {
      attrs = {};
      attrs[key] = value;
    }

    // make sure options is an object
    options = options || {};

    // reset code and css to source values if unset
    source = this.get('source') || attrs.source || {};
    preprocess_attribute(source, attrs, 'code', options);
    preprocess_attribute(source, attrs, 'css', options);

    return Backbone.Model.prototype.set.call(this, attrs, options);
  },


  isModified: function isModified() {
    var source    = this.get('source'),
        modified  = false;

    modified = modified || this.get('code') !== source.code;
    modified = modified || this.get('css') !== source.css;

    return modified;
  },


  validate: function validate(attributes) {
    if (!is_valid_code(attributes.code)) {
      nodeca.client.fontomas.logger.debug(
        "models.glyph.validate: bad char code:", attributes.code);
      return "Bad char code: " + attributes.code;
    }

    return null;
  },


  toggle: function (key, val) {
    if (undefined === val) {
      val = !this.get(key);
    }

    this.set(key, !!val);
  },


  // Stub to prevent Backbone from reading or saving the model to the server.
  // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
  // if model doesn't have own `sync()` method.
  sync: function sync() {}
});
