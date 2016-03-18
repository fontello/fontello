// Handles requests for font generation
//
'use strict';


const _             = require('lodash');
const validator     = require('is-my-json-valid');
const config_schema = require('../_lib/config_schema');


module.exports = function (N, apiPath) {
  const cfg_check = validator(config_schema, { verbose: true });

  // Disable validation here to customize error message
  N.validate(apiPath, { additionalProperties: true, properties: {} });


  N.wire.before(apiPath, function validate(env) {
    if (cfg_check(env.params)) return;

    let message = [ env.t('err_cfg_validation') ].concat(_.map(
      cfg_check.errors,
      e => `- ${e.field} ${e.message}`
    )).join('\n');

    throw { code: N.io.CLIENT_ERROR, message };
  });


  N.wire.on(apiPath, function* request_font_generation(env) {
    let params = { config: env.params };

    yield N.wire.emit('internal:fontello.font_build', params);
    env.res.id = params.fontId;
  });
};
