// Update session `sid` with client `config`
//
'use strict';


const _           = require('lodash');
const fs          = require('mz/fs');
const validator   = require('is-my-json-valid');


const config_schema = require('./font/_lib/config_schema');


module.exports = function (N, apiPath) {

  N.validate(apiPath, {
    sid:    { type: 'string', required: true, pattern: /^[0-9a-f]+/ },
    config: { type: 'string', required: true }
  });


  // Validate and parse post data
  //
  N.wire.before(apiPath, function validate_and_parse(env) {
    // Validate post `config` param
    let path = _.get(env.req, 'files.config.0.path');

    if (!path) {
      throw { code: N.io.BAD_REQUEST, message: 'Missed "config" param - must be file' };
    }
  });


  // Update session with client config
  //
  N.wire.on(apiPath, async function api_update(env) {
    let configPath = _.get(env.req, 'files.config.0.path');
    let configFile;

    // Extract config
    configFile = await fs.readFile(configPath, { encoding: 'utf-8' });

    let config;

    try {
      config = JSON.parse(configFile);
    } catch (__) {
      throw { code: N.io.BAD_REQUEST, message: "Can't parse config data" };
    }

    // Validate config content
    let cfg_validator = validator(config_schema, { verbose: true });

    if (!cfg_validator(config)) {
      // generate error text
      let error = [ 'Invalid config format:' ].concat(_.map(
        cfg_validator.errors,
        e => `- ${e.field} ${e.message}`
      )).join('\n');

      throw { code: N.io.BAD_REQUEST, message: error };
    }

    let linkData;

    try {
      linkData = await N.shortlinks.get(env.params.sid, { valueEncoding: 'json' });
    } catch (err) {
      // if session id (shortlink) not found - return 404
      if (err.type === 'NotFoundError') throw { code: N.io.NOT_FOUND, message: 'Session expired' };

      throw err;
    }

    linkData.config = config;

    await N.shortlinks.put(
      env.params.sid,
      linkData,
      { ttl: 6 * 60 * 60 * 1000, valueEncoding: 'json' }
    );
  });
};
