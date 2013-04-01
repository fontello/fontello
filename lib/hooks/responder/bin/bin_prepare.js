// This responder is intended to serve static files and assets.

'use strict';


var _    = require('lodash');
var http = require('http');


module.exports = function (N) {
  function log_request(env) {
    var err     = env.err
      , req     = env.origin.req
      , message = http.STATUS_CODES[env.status]
      , logger  = N.logger.getLogger(env.method)
      , level;

    if (N.io.APP_ERROR <= env.status) {
      message = err.stack || err.message || JSON.stringify(err);
      level = 'fatal';
    } else if (N.io.BAD_REQUEST <= env.status && N.io.APP_ERROR > env.status) {
      level = 'error';
    } else {
      level = 'info';
    }

    logger[level]('%s - "%s %s HTTP/%s" %d "%s" - %s'
    , req.connection.remoteAddress
    , req.method
    , req.url
    , req.httpVersion
    , env.status
    , req.headers['user-agent']
    , message
    );
  }


  N.wire.on('responder:bin', function bin_prepare(env, callback) {
    var req    = env.origin.req
      , match  = N.runtime.router.match(req.fullUrl)
      , params = _.extend({}, req.query, (match || {}).params)
      , apiPath;

    env.log_request = log_request;

    if (!match) {
      env.err = N.io.NOT_FOUND;
      callback();
      return;
    }

    env.method = match.meta;
    env.params = params;
    apiPath = 'server_bin:' + env.method;

    if (!N.validate.test(apiPath, params)) {
      env.err = N.io.BAD_REQUEST;
      callback();
      return;
    }

    N.wire.emit(apiPath, env, function (err) {
      env.err = err;
      callback();
    });
  });
};
