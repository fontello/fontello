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

    N.wire.emit(('server_chain:' + env.request.type), env, function (err) {
      env.err = err;
      callback();
    });
  });
};
