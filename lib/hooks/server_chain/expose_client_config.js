'use strict';


module.exports = function (N) {
  var glyphSize         = N.config.options.glyph_size         || {}
    , autoguessCharcode = N.config.options.autoguess_charcode || {};

  N.wire.before('server_chain:http', function (env) {
    env.runtime.config = {
      glyph_size: {
        min: glyphSize.min || 12
      , val: glyphSize.val || 16
      , max: glyphSize.max || 30
      }
    , autoguess_charcode: {
        min: autoguessCharcode.min || 0xe800
      , max: autoguessCharcode.max || 0xf8ff
      }
    };
  });
};
