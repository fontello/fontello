'use strict';


const _           = require('lodash');
const fs          = require('mz/fs');
const crypto      = require('crypto');
const validator   = require('is-my-json-valid');


const config_schema = require('./font/_lib/config_schema');


module.exports = function (N, apiPath) {

  N.validate(apiPath, {});


  // Validate and parse post data
  //
  N.wire.before(apiPath, function validate_and_parse(env) {
    // Validate post `url` param
    let fields_validator = validator({
      properties: {
        url: {
          format : 'url',
          maxLength : 200,
          required  : false,
          messages: {
            format: 'Invalid URL format',
            maxLength: 'URL too long'
          }
        }
      }
    }, { verbose: true });

    let url = _.get(env.req, 'fields.url.0');

    if (url && !fields_validator({ url })) {
      throw { code: N.io.BAD_REQUEST, message: fields_validator.errors[0].message };
    }

    // Validate post `config` param
    let path = _.get(env.req, 'files.config.0.path');

    if (!path) {
      throw { code: N.io.BAD_REQUEST, message: 'Missed "config" param - must be file' };
    }
  });


  // Create session and save config
  //
  N.wire.on(apiPath, async function save_config(env) {
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

    let sid = crypto.randomBytes(16).toString('hex');

    let linkData = {
      ts: Date.now(),
      ip: env.req.ip,
      config
    };

    let url = _.get(env.req, 'fields.url.0');

    if (url) linkData.url = url;

    await N.shortlinks.put(
      sid,
      linkData,
      { ttl: 6 * 60 * 60 * 1000, valueEncoding: 'json' }
    );

    throw { code: N.io.OK, message: sid };
  });
};
