// Executes the server chain. It wraps server method calls, to add things,
// that should be executed only once:
//
// - session up/down.
// - locale load/autodetect.
// - CSRF protection.
// - etc.

'use strict';


module.exports = function (N) {
  N.wire.on([ 'responder:http', 'responder:rpc' ], function server_chain_exec(env) {

    // Skip, if error happened at previous stage
    if (env.err) return;

    // No channel -> error
    if (!N.wire.has('server:' + env.method)) {
      env.err = N.io.NOT_FOUND;
      return;
    }

    return N.wire.emit(('server_chain:' + env.req.type + ':' + env.method), env)
      .catch(err => {
        env.err = err;
      });
  });
};
