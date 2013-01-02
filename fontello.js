#!/usr/bin/env node


"use strict";


var run = module.exports = function run(args, callback) {
  require('./lib/runner').bootstrap(__dirname, {
    init: function () {
      var
      N                 = global.N,
      _                 = global.underscore,
      glyphSize         = N.config.options.glyph_size || {},
      autoguessCharcode = N.config.options.autoguess_charcode || {};

      N.runtime.config = _.extend(N.runtime.config || {}, {
        glyph_size: {
          min: glyphSize.min || 12,
          val: glyphSize.val || 16,
          max: glyphSize.max || 30
        },
        autoguess_charcode: {
          min: autoguessCharcode.min || 0xe800,
          max: autoguessCharcode.max || 0xf8ff
        }
      });
    }
  }, args, callback);
};


if (!module.parent) {
  run();
}
