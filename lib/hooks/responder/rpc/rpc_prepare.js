// Prepare http request for server chain
// - fetch POST data
// - unwrap payload (extract CSRF, method, params)


'use strict';


var _    = require('lodash');
var http = require('http');


var MAX_POST_DATA = 10 * 1000 * 1024; // Max post data in bytes
var MAX_PARAMS_LOG_LENGTH = 60;


module.exports = function (N) {

  function formatParams(params) {
    var result = '';

    _.forEach(params, function (value, key) {
      result += (0 === result.length) ? '?' : '&';
      result += encodeURIComponent(key);
      result += '=';

      if (_.isObject(value)) {
        result += '{...}'; // Do not dump nested objects.
      } else {
        result += encodeURIComponent(value);
      }

      if (MAX_PARAMS_LOG_LENGTH < result.length) {
        return false;
      }
    });

    return result.slice(0, MAX_PARAMS_LOG_LENGTH);
  }


  function log(env) {
    var err = env.err
      , req = env.origin.req
      , message = http.STATUS_CODES[env.status]
      , logger = N.logger.getLogger('rpc@' + env.method)
      , level = 'info';

    if (err) {
      if (N.io.APP_ERROR <= err.code) {
        level = 'fatal';
        message = err.stack || err.message || JSON.stringify(err);
      } else if (N.io.BAD_REQUEST <= err.code && N.io.APP_ERROR > err.code) {
        level = 'error';
        if (http.STATUS_CODES.hasOwnProperty(err.code)) {
          message = http.STATUS_CODES[err.code];
        }
      }
    }

    logger[level]('%s - "RPC %s%s HTTP/%s" - "%s" - %s',
                  req.connection.remoteAddress,
                  env.method,
                  formatParams(env.params),
                  req.httpVersion,
                  req.headers['user-agent'] || '',
                  message);
  }

  N.wire.before('responder:rpc', function rpc_prepare(env, callback) {
    var req = env.origin.req
      , rawPostData = '';

    env.log_request = log;

    //
    // invalid request
    //

    if ('POST' !== req.method) {
      env.err = N.io.BAD_REQUEST;
      callback();
      return;
    }

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

    req.on('data', function (chunk) {
      rawPostData += chunk;

      if (MAX_POST_DATA < Buffer.byteLength(rawPostData)) {
        // max allowed post data reached, drop request.
        req.removeAllListeners('data');
        req.removeAllListeners('end');

        env.err = { code: N.io.BAD_REQUEST, message: 'Too big post data' };

        // Force destroy incoming connection
        req.connection.destroy();

        callback();
      }
    });

    //
    // when done (on success) process POST data and handle request
    //

    req.on('end', function () {
      var payload;

      try {
        payload = JSON.parse(rawPostData);
      } catch (err) {
        env.err = { code: N.io.BAD_REQUEST, message: 'Cannot parse post data' };
        callback();
        return;
      }

      env.params = payload.params || {};

      // save CSRF token if it was sent
      req.csrf = payload.csrf;

      // invalid payload
      if (!payload.version || !payload.method) {
        env.err = N.io.BAD_REQUEST;
        callback();
        return;
      }

      env.method = payload.method;

      // invalid client version.
      // client will check server version by it's own,
      // so in fact this error is not used by client
      if (payload.version !== N.runtime.version) {
        env.err = N.io.BAD_REQUEST;
        callback();
        return;
      }

      callback();
    });
  });
};
