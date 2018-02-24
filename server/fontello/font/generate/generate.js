// Handles requests for font generation
//
'use strict';


const _             = require('lodash');
const validator     = require('is-my-json-valid');
const config_schema = require('../_lib/config_schema');
const fs            = require('mz/fs');


module.exports = function (N, apiPath) {
  const cfg_check = validator(config_schema, { verbose: true });

  // Disable validation here to customize error message
  N.validate(apiPath, {
    config: { type: 'string',  required: true }
  });


  N.wire.before(apiPath, async function validate(env) {
    let path = _.get(env.req, 'files.config.0.path');

    if (!path) throw N.io.BAD_REQUEST;

    let file = await fs.readFile(path, { encoding: 'utf-8' });

    try {
      env.data.config = JSON.parse(file);
    } catch (__) {
      throw env.t('err_cfg_parse');
    }

    if (cfg_check(env.data.config)) return;

    let message = [ env.t('err_cfg_validation') ].concat(_.map(
      cfg_check.errors,
      e => `- ${e.field} ${e.message}`
    )).join('\n');

    throw { code: N.io.CLIENT_ERROR, message };
  });


  N.wire.on(apiPath, async function request_font_generation(env) {
    let params = { config: env.data.config };

    await N.wire.emit('internal:fontello.font_build', params);
    env.res.id = params.fontId;
  });
};
