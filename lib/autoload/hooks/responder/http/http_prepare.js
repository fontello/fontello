// Prepare http request for server chain
// - find method (with router)
// - parse parameters
//
'use strict';


var _           = require('lodash');


module.exports = function (N) {

  //
  // Init envirement for http
  //

  N.wire.before('responder:http', function http_prepare(env) {
    var req        = env.origin.req,
        httpMethod = req.method.toLowerCase(),
        match      = env.req.matched; // N.router.match(req.fullUrl)

    env.params = (match || {}).params;

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
