// Handles requests for font generation.
//


'use strict';


var fontBuilder = require('./_lib/builder');


module.exports = function (N, apiPath) {
  var builder = fontBuilder(N);


  N.validate(apiPath, {
    name: {
      type: 'string'
    , required: false
    }
  , css_prefix_text: {
      type: 'string'
    , required: true
    }
  , css_use_suffix: {
      type: 'boolean'
    , required: true
    }
  , hinting: {
      type: 'boolean'
    , required: false
    }
  , glyphs: {
      type: 'array'
    , required: true
    }
  });


  N.wire.on(apiPath, function (env, callback) {
    builder.buildFont(env.params, function (err, info) {
      if (err) {
        callback(err);
        return;
      }

      env.response.data.id = info.fontId;
      callback();
    });
  });
};
