// Executes the server chain. It wraps server method calls, to add things,
// that should be executed only once:
//
// - session up/down.
// - locale load/autodetect.
// - CSRF protection.
// - etc.

'use strict';


module.exports = function (N) {
  N.wire.on(['responder:http', 'responder:rpc'], function server_chain_exec(env, callback) {

    // Skip, if error happened at previous stage
    if (env.err) {
      callback();
      return;
    }

    // No channel -> error
    if (!N.wire.has('server:' + env.method)) {
      env.err = N.io.NOT_FOUND;
      return;
    }

    env.extras.puncher.start('server_chain:* exec');

    N.wire.emit(('server_chain:' + env.req.type + ':' + env.method), env, function (err) {
      env.extras.puncher.stop();
      env.err = err;
      callback();
    });
  });
};
