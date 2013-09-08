// This responder is intended to serve static files and assets.

'use strict';


var _    = require('lodash');
var http = require('http');


module.exports = function (N) {
  function log_request(env) {
    var err     = env.err
      , req     = env.origin.req
      , message = http.STATUS_CODES[env.status]
      , logger  = N.logger.getLogger('bin@' + env.method)
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
    , req.headers['user-agent'] || ''
    , message
    );
  }


  N.wire.before('responder:bin', function bin_prepare(env) {
    var req    = env.origin.req
      , match  = env.req.matched // N.runtime.router.match(req.fullUrl)
      , params = _.extend({}, req.query, (match || {}).params);

    env.log_request = log_request;

    env.params = params;

    if (!match) {
      env.err = N.io.NOT_FOUND;
      return;
    }

    env.method = match.meta.methods.get;
  });
};
