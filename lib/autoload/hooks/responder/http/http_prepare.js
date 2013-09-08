// Prepare http request for server chain
// - find method (with router)
// - parse parameters


'use strict';


var _           = require('lodash');
var http        = require('http');


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
  N.wire.before('responder:http', function http_prepare(env) {
    var req        = env.origin.req
      , httpMethod = req.method.toLowerCase()
      , match      = env.req.matched // N.runtime.router.match(req.fullUrl)
        // mix GET QUERY params (part after ? in URL) and params from router
        // params from router take precedence
      , params     = _.extend({}, req.query, (match || {}).params);

    env.log_request = log;

    env.params = params;

    // Nothing matched -> error
    if (!match) {
      env.err = N.io.NOT_FOUND;
      return;
    }

    // Matched route is not suitable for the request type -> error.
    if (!_.has(match.meta.methods, httpMethod)) {
      env.err = N.io.NOT_FOUND;
      return;
    }

    env.method = match.meta.methods[httpMethod];
  });
};
