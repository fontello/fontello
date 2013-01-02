"use strict";


/*global N*/


////////////////////////////////////////////////////////////////////////////////


var config = (function () {
  var
  glyphSize         = N.config.options.glyph_size || {},
  autoguessCharcode = N.config.options.autoguess_charcode || {};

  return {
    glyph_size: {
      min: glyphSize.min || 12,
      val: glyphSize.val || 16,
      max: glyphSize.max || 30
    },
    autoguess_charcode: {
      min: autoguessCharcode.min || 0xe800,
      max: autoguessCharcode.max || 0xf8ff
    }
  };
}());


////////////////////////////////////////////////////////////////////////////////


N.filters.after('', { weight: 50 }, function (params, callback) {
  if (this.origin.http) {
    this.runtime.config = config;
  }

  callback();
});
