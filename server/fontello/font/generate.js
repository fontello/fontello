// Handles requests for font generation
//
'use strict';


const fontBuilder   = require('./_lib/builder');
const config_schema = require('./_lib/config_schema');


module.exports = function (N, apiPath) {
  const builder = fontBuilder(N);

  N.validate(apiPath, config_schema);


  N.wire.on(apiPath, function* request_font_generation(env) {
    let info = yield builder.buildFont(env.params);

    env.res.id = info.fontId;
  });
};
