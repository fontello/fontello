// Inject timeline generator
//

"use strict";


module.exports = function (N) {

  // Mark start of the request
  //
  N.wire.before(['responder:http', 'responder:rpc'], { priority: -999 }, function puncher_start(env) {
    env.extras.puncher.start('Total', {
      'transport': env.req.type,
      'request params': env.params
    });
  });

  N.wire.after(['responder:http', 'responder:rpc'], { priority: 20 }, function puncher_end(env) {

    // Do nothing on errors, that relax puncher scopes pairing
    if (env.err) { return; }

    // skip on JSON requests
    if ((env.origin.req.headers || {})['x-requested-with'] === 'XMLHttpRequest') { return; }

    // stop puncher & check that all scopes were closed
    if (!env.extras.puncher.stop().stopped) {
      env.err = new Error("Some of puncher scopes were not closed in " + env.method);
      return;
    }

    // Push puncher data to response
    env.res.blocks = env.res.blocks || {};
    env.res.blocks.puncher_stats = env.extras.puncher.result;
  });
};
