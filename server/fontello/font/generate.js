// Handles requests for font generation
//
'use strict';


const config_schema = require('./_lib/config_schema');


module.exports = function (N, apiPath) {

  N.validate(apiPath, config_schema);


  N.wire.on(apiPath, function* request_font_generation(env) {
    let params = { config: env.params };

    yield N.wire.emit('internal:fontello.font_build', params);
    env.res.id = params.fontId;
  });
};
