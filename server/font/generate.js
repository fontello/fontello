// Handles requests for font generation.
//


'use strict';


var fontBuilder   = require('./_lib/builder');
var config_schema = require('./_lib/config_schema');


module.exports = function (N, apiPath) {
  var builder = fontBuilder(N);

  N.validate(apiPath, config_schema);

  N.wire.on(apiPath, function (env, callback) {
    builder.buildFont(env.params, function (err, info) {
      if (err) {
        callback(err);
        return;
      }

      env.res.id = info.fontId;
      callback();
    });
  });
};
