// Inject timeline generator
//

"use strict";


module.exports = function (N) {

  // Mark start of the request
  //
  N.wire.before(['responder:http', 'responder:rpc'], { priority: -999 }, function puncher_start(env) {
    env.extras.puncher.start('Total', {
      'transport': env.request.origin,
      'request params': env.params
    });
  });

  N.wire.after(['responder:http', 'responder:rpc'], { priority: 20 }, function puncher_add_data(env) {
    // stop puncher & check that all scopes were closed
    if (!env.extras.puncher.stop().stopped) {
      env.err = new Error("Some of puncher scopes were not closed in " + env.method);
      return;
    }

    if (!env.err) {
      env.response.data.blocks.puncher_stats = env.extras.puncher.result;
    }
  });
};
