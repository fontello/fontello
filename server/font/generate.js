// Handles requests for font generation.
//


'use strict';


var fontBuilder = require('../../lib/font_builder');
var fontConfig  = require('../../lib/font_config');


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
  , glyphs: {
      type: 'array'
    , required: true
    }
  });


  N.wire.on(apiPath, function (env, callback) {
    var config = fontConfig(env.params)
      , task   = null;

    if (!config || 0 >= config.glyphs.length) {
      callback('Invalid request');
      return;
    }

    task = builder.addTask(config);

    env.response.data.id     = task.fontId;
    env.response.data.status = 'enqueued';

    callback();
  });
};
