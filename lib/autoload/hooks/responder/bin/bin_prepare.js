// This responder is intended to serve static files and assets.
//
'use strict';


module.exports = function (N) {

  N.wire.before('responder:bin', function bin_prepare(env) {
    var match  = env.req.matched; // N.router.match(req.fullUrl)

    env.params = (match || {}).params;

    if (!match) {
      env.err = N.io.NOT_FOUND;
      return;
    }

    env.method = match.meta.methods.get;
  });
};
