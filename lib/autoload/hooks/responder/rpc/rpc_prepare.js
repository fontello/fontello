// Prepare http request for server chain
// - fetch POST data
// - unwrap payload (extract CSRF, method, params)


'use strict';


const _      = require('lodash');
const http   = require('http');
const encode = require('mdurl').encode;


const MAX_POST_DATA = 10 * 1000 * 1024; // Max post data in bytes
const MAX_PARAMS_LOG_LENGTH = 60;

// Values of this params should never leak into logs
const PROTECTED_PARAMS = [ 'pwd', 'pass', 'password' ];


module.exports = function (N) {

  function formatParams(params) {
    let result = '';

    _.forEach(params, function (value, key) {
      result += (result.length === 0) ? '?' : '&';
      result += encode(String(key), encode.componentChars);
      result += '=';

      if (PROTECTED_PARAMS.indexOf(key) !== -1) {
        // Don't dump protected params
        result += '****';

      } else if (_.isObject(value)) {
        // Do not dump nested objects.
        result += '{...}';

      } else {
        result += encode(String(value), encode.componentChars);
      }

      if (result.length > MAX_PARAMS_LOG_LENGTH) return false; // terminate
    });

    return result.slice(0, MAX_PARAMS_LOG_LENGTH);
  }


  function log(env) {
    var err = env.err,
        req = env.origin.req,
        message = http.STATUS_CODES[env.status],
        logger = N.logger.getLogger('rpc@' + (env.method ? env.method : '')),
        level = 'info';

    if (err) {
      if (err.code >= N.io.APP_ERROR) {
        level = 'fatal';
        message = err.stack || err.message || JSON.stringify(err);
      } else if (err.code >= N.io.BAD_REQUEST) {
        level = 'error';
        message = err.message || http.STATUS_CODES[err.code];
      }
    }

    logger[level]('%s - "RPC %s%s HTTP/%s" - "%s" - %s',
                  env.req.ip,
                  env.method || '[empty]',
                  formatParams(env.params),
                  req.httpVersion,
                  req.headers['user-agent'] || '',
                  message);
  }

  N.wire.before('responder:rpc', function rpc_prepare(env, callback) {
    let req = env.origin.req;

    env.log_request = log;

    //
    // invalid request
    //

    if (req.method !== 'POST') {
      env.err = N.io.BAD_REQUEST;
      callback();
      return;
    }

    //
    // Check request size early by header and terminate immediately for big data
    //
    let length = req.headers['content-length'];

    if (!length) {
      env.err = N.io.LENGTH_REQUIRED;
      callback();
      return;
    }

    if (length > MAX_POST_DATA) {
      env.err = { code: N.io.BAD_REQUEST, message: 'Too big post data' };
      callback();
      return;
    }

    //
    // start harvesting POST data
    //
    let chunks = [],
        chunksLength = 0;

    req.on('data', chunk => {
      chunks.push(chunk);
      chunksLength += chunk.length;

      if (chunksLength > MAX_POST_DATA) {
        // max allowed post data reached, drop request.
        req.removeAllListeners();
        req.connection.destroy();
      }
    });

    //
    // when done (on success) process POST data and handle request
    //

    req.on('end', () => {
      let payload;

      try {
        payload = JSON.parse(Buffer.concat(chunks).toString());
        chunks = [];
      } catch (err) {
        env.err = { code: N.io.BAD_REQUEST, message: 'Cannot parse post data' };
        callback();
        return;
      }

      env.params = payload.params || {};

      // save CSRF token if it was sent
      req.csrf = payload.csrf;

      // invalid payload
      if (!payload.version_hash || !payload.method) {
        env.err = N.io.BAD_REQUEST;
        callback();
        return;
      }

      env.method = payload.method;

      // invalid client version.
      // client will check server version by it's own,
      // so in fact this error is not used by client
      if (payload.version_hash !== N.version_hash) {
        env.err = { code: N.io.BAD_REQUEST, message: 'Client version outdated' };
        callback();
        return;
      }

      callback();
    });
  });
};
