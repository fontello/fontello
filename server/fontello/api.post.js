'use strict';


const _           = require('lodash');
const fs          = require('mz/fs');
const crypto      = require('crypto');
const validator   = require('is-my-json-valid');
const formidable  = require('formidable');
const Promise     = require('bluebird');


const config_schema = require('./font/_lib/config_schema');


const MAX_POST_DATA = 10 * 1000 * 1024; // Max post data in bytes
const MAX_POST_FIELDS = 20;


module.exports = function (N, apiPath) {

  N.validate(apiPath, {});


  function remove_uploaded_files(files) {
    _.forEach(files, fileInfo => fs.unlink(fileInfo.path));
  }


  // Validate and parse post data
  //
  N.wire.before(apiPath, function validate_and_parse(env, callback) {
    // check length
    let len = parseInt(env.origin.req.headers['content-length'], 10);

    if (!len || len > MAX_POST_DATA) {
      callback(413); // Request Entity Too Large
      return;
    }

    // create & configure form parser
    let form = new formidable.IncomingForm();

    form.maxFields = MAX_POST_FIELDS;

    // parse form & process result
    form.parse(env.origin.req, function (err, fields, files) {
      if (err) {
        callback(err);
        remove_uploaded_files(files);
        return;
      }

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

      if (!fields_validator(fields)) {
        callback({ code: N.io.BAD_REQUEST, message: fields_validator.errors[0].message });
        remove_uploaded_files(files);
        return;
      }

      // Validate post `config` param
      let files_validator = validator({
        properties: {
          config: {
            type: 'object',
            required: true,
            messages: {
              required: 'Missed "config" param - must be file'
            }
          }
        }
      }, { verbose: true });

      if (!files_validator(files)) {
        callback({ code: N.io.BAD_REQUEST, message: files_validator.errors[0].message });
        remove_uploaded_files(files);
        return;
      }

      env.data.files = files;
      env.data.fields = fields;

      callback();
    });
  });


  // Create session and save config
  //
  N.wire.on(apiPath, function* save_config(env) {
    let configPath = env.data.files.config.path;
    let configFile;

    // Extract config
    try {
      configFile = yield fs.readFile(configPath, { encoding: 'utf-8' });
    } catch (err) {
      remove_uploaded_files(env.data.files);
      throw err;
    }

    let config;

    try {
      config = JSON.parse(configFile);
    } catch (__) {
      remove_uploaded_files(env.data.files);
      throw { code: N.io.BAD_REQUEST, message: 'Can\'t parse config data' };
    }

    // Validate config content
    let cfg_validator = validator(config_schema, { verbose: true });

    if (!cfg_validator(config)) {
      // generate error text
      let error = [ 'Invalid config format:' ].concat(_.map(
        cfg_validator.errors,
        e => `- ${e.field} ${e.message}`
      )).join('\n');

      remove_uploaded_files(env.data.files);
      throw { code: N.io.BAD_REQUEST, message: error };
    }

    let sid = crypto.randomBytes(16).toString('hex');

    let linkData = {
      ts: Date.now(),
      ip: env.req.ip,
      config
    };

    if (env.data.fields.url) linkData.url = env.data.fields.url;

    yield Promise.fromCallback(cb => N.shortlinks.put(
      sid,
      linkData,
      { ttl: 6 * 60 * 60 * 1000, valueEncoding: 'json' },
      cb
    ));

    remove_uploaded_files(env.data.files);

    throw { code: N.io.OK, message: sid };
  });
};
