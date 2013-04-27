// Prepare http request for server chain
// - find method (with router)
// - parse parameters


'use strict';


var http  = require('http');
var _     = require('lodash');


var MAX_POST_DATA = 10 * 1000 * 1024; // Max post data in bytes


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

      //
      // Set encoding, to glue data chunks as strings.
      // In other case you need to work with buffer, to avoid
      // breaking unicode characters.
      //
      // We don't expect rpc to work with big uploads, so, strings are enougth
      //

      req.setEncoding('utf8');

      //
      // start harvesting POST data
      //
      var rawPostData ='';

      req.on('data', function (chunk) {
        rawPostData += chunk;

        if (MAX_POST_DATA < Buffer.byteLength(rawPostData)) {
          // max allowed post data reached, drop request.
          req.removeAllListeners('data');
          req.removeAllListeners('end');

          // Force destroy incoming connection
          req.connection.destroy();

          env.err = { code: N.io.BAD_REQUEST, message: 'Too big post data' };
          callback();
        }
      });

      //
      // when done (on success) process POST data and handle request
      //
      req.on('end', function () {
        env.post = rawPostData;
        callback();
      });

      return;
    }

    callback();
  });
};
