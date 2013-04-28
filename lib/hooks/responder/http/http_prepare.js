// Prepare http request for server chain
// - find method (with router)
// - parse parameters


'use strict';


var _           = require('lodash');
var http        = require('http');
var formidable  = require('formidable');

var MAX_POST_DATA = 10 * 1000 * 1024; // Max post data in bytes
var MAX_POST_FIELDS = 20;

module.exports = function (N) {

  //
  // Request logger for http requests
  //
  function log(env) {
    var err = env.err
      , req = env.origin.req
      , message = http.STATUS_CODES[env.status]
      , logger = N.logger.getLogger('http@' + env.method)
      , level;

    if (N.io.APP_ERROR <= env.status) {
      message = err.stack || err.message || JSON.stringify(err);
      level   = 'fatal';
    } else if (N.io.BAD_REQUEST <= env.status && N.io.APP_ERROR > env.status) {
      level = 'error';
    } else {
      level = 'info';
    }

    logger[level]('%s - "%s %s HTTP/%s" %d "%s" - %s',
                  req.connection.remoteAddress,
                  req.method,
                  req.url,
                  req.httpVersion,
                  env.status,
                  req.headers['user-agent'] || '',
                  message);
  }

  //
  // Init envirement for http
  //

  N.wire.before('responder:http', function http_prepare(env, callback) {
    var req = env.origin.req
      , match = env.request.matched // N.runtime.router.match(req.fullUrl)
        // mix GET QUERY params (part after ? in URL) and params from router
        // params from router take precedence
      , params = _.extend({}, req.query, (match || {}).params);

    env.log_request = log;

    env.params = params;

    // Nothing matched -> error
    if (!match) {
      env.err = N.io.NOT_FOUND;
      callback();
      return;
    }

    env.method = match.meta;

    //
    // On post request - receive POST data & put to `env.post
    //
    if ('POST' === req.method) {

      var len = parseInt(req.headers['content-length'], 10);

      if (!len || len > MAX_POST_DATA) {
        env.err = 413;
        callback();
        return;
      }

      var form = new formidable.IncomingForm();

      form.maxFields = MAX_POST_FIELDS;

      form.parse(req, function(err, fields, files) {
        if (err) {
          callback(err);
          return;
        }

        env.post = { fields: fields, files: files };
        callback();
      });

      return;
    }

    callback();
  });
};
