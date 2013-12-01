'use strict';


var _           = require('lodash');
var fs          = require('fs');
var crypto      = require('crypto');
var revalidator = require('revalidator');
var formidable  = require('formidable');


var config_schema = require('./font/_lib/config_schema');


var MAX_POST_DATA = 10 * 1000 * 1024; // Max post data in bytes
var MAX_POST_FIELDS = 20;


module.exports = function (N, apiPath) {
  N.validate(apiPath, {});

  N.wire.on(apiPath, function app_post(env, callback) {

    // check length
    var len = parseInt(env.origin.req.headers['content-length'], 10);
    if (!len || len > MAX_POST_DATA) {
      callback(413); // Request Entity Too Large
      return;
    }

    // create & configure form parser
    var form = new formidable.IncomingForm();
    form.maxFields = MAX_POST_FIELDS;

    // parse form & process result
    form.parse(env.origin.req, function(err, fields, files) {
      if (err) {
        callback(err);
        return;
      }

      // Validate post `url` param
      var chk_fields = revalidator.validate(fields, {
        properties : {
          url : {
            format : 'url',
            maxLength : 200,
            required  : false,
            messages: {
              format: 'Invalid URL format',
              maxLength: 'URL too long'
            }
          }
        }
      });
      if (!chk_fields.valid) {
        callback({ code: N.io.BAD_REQUEST, message: chk_fields.errors[0].message });
        return;
      }

      // Validate post `config` param
      var chk_files = revalidator.validate(files, {
        properties : {
          config : {
            type : 'object',
            required  : true,
            messages: {
              required: 'Missed "config" param - must be file'
            }
          }
        }
      });
      if (!chk_files.valid) {
        callback({ code: N.io.BAD_REQUEST, message: chk_files.errors[0].message });
        return;
      }

      // Try to extract config
      var configPath = files.config.path;
      var config;

      fs.readFile(configPath, { encoding: 'utf-8'}, function (err, configFile) {
        // Always cleanup posted files
        // Delete is async, but we don't wait result
        _.forEach(files, function(fileInfo) {
          fs.unlink(fileInfo.path, function () {});
        });

        if (err) {
          callback(err);
          return;
        }

        try {
          config = JSON.parse(configFile);
        } catch (err) {
          callback({ code: N.io.BAD_REQUEST, message: 'Can\'t parse config data' });
          return;
        }

        // Validate config content
        var chk_config = revalidator.validate(config, config_schema);
        var error;
        if (!chk_config.valid) {

          // generate error text
          error = ['Invalid config format:'].concat(_.map(
            chk_config.errors,
            function (e) { return '- ' + e.property + ' ' + e.message; }
          )).join('\n');

          callback({ code: N.io.BAD_REQUEST, message: error });
          return;
        }

        // place config to DB & return link id
        var shortLink = new N.models.ShortLink();

        shortLink.ts = Date.now();
        shortLink.sid = crypto.randomBytes(16).toString('hex');
        shortLink.ip = env.req.ip;
        shortLink.config = config;
        if (fields.url) { shortLink.url = fields.url; }

        shortLink.save(function (err) {
          if (err) {
            callback(err);
            return;
          }

          callback({ code: N.io.OK, message: shortLink.sid });
        });
      });
    });
  });
};
