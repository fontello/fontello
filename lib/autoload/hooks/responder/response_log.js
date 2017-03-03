// Log server response.
// Also write fatal errors details to system channel
//
'use strict';


const _         = require('lodash');
const serialize = require('serialize-error');
const parseUrl  = require('url').parse;
const http      = require('http');
const encode    = require('mdurl').encode;


const MAX_PARAMS_LOG_LENGTH = 100;
const PROTECTED_PARAMS = [ 'pwd', 'pass', 'password' ];


module.exports = function (N) {

  // Emulate request url for RPC calls.
  function createRpcUrl(env) {
    let result = '';
    let params = env.params;

    _.forEach(params, function (value, key) {
      result += result.length ? '&' : '?';
      result += encode(String(key), encode.componentChars);
      result += '=';

      // Don't dump protected params
      if (PROTECTED_PARAMS.indexOf(key) !== -1) result += '****';
      // Do not dump nested objects.
      else if (_.isObject(value)) result += '{...}';
      else result += encode(String(value), encode.componentChars);

      if (result.length > MAX_PARAMS_LOG_LENGTH) {
        result = result.slice(0, MAX_PARAMS_LOG_LENGTH);
        return false; // terminate
      }
    });

    return `/RPC/${env.method}${result}`;
  }


  N.wire.after([ 'responder:*' ], { priority: 101 }, function response_compress(env) {

    //
    // Commons
    //

    let logger = N.logger.getLogger(`${env.req.type}@${env.method}`);

    let req    = env.origin.req;
    let url    = env.req.type === 'rpc' ? createRpcUrl(env) : parseUrl(req.url).path;

    let request_info = `${req.method} ${url} HTTP/${req.httpVersion}`;
    let user_agent   = req.headers['user-agent'] || '';

    let message      = http.STATUS_CODES[env.status];

    let level  = 'info';

    //
    // Check error and select error level
    //

    if (env.err) {
      let err = env.err;

      if (err.code >= N.io.APP_ERROR) {
        level = 'fatal';
        message = err.stack || err.message || JSON.stringify(err);

      } else if (err.code >= N.io.BAD_REQUEST) {
        level = 'error';
        message = err.message || message;
      }
    }

    logger[level](
      `${env.req.ip} - ${JSON.stringify(request_info)} ` +
      `${env.status} ${JSON.stringify(user_agent)} - ${message}`
    );

    //
    // On fatal error write details to system log namespace
    //

    if (env.err_orig && env.err_orig instanceof Error) {
      let err = env.err_orig;

      let eData = serialize(err);
      delete eData.stack;

      let message;

      try {
        message = `***
ip:        ${env.req.ip}
url:       ${req.url}
request:   ${req.method}
responder: ${env.req.type}
apiPath:   ${env.method || '[unknown]'}
params:    ${JSON.stringify(env.params || '', null, '  ')}

stack: ${err.stack}

error: ${JSON.stringify(eData, null, '  ')}
***`;
      } catch (e) {
        message = e.stack;
      }

      N.logger.fatal(message);
    }
  });

};
