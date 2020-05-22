// Executes the server_bin:* chain. Used by assets and static server,
// to execute quick, without sessions, cookies and so on.
//

'use strict';


module.exports = function (N) {
  N.wire.on('responder:bin', function server_bin_exec(env) {
    let channel = 'server_bin:' + env.method;

    // Skip, if error happened at previous stage
    if (env.err) return;

    // No channel -> error
    if (!N.wire.has(channel)) {
      env.err = N.io.NOT_FOUND;
      return;
    }

    // Validate the request.
    let result = N.validate.process(channel, env.params);

    // When method has no validation schema, test() returns `null`.
    // Otherwise - object with `valid` property.
    if (!result) {
      env.err = `Params validator not found for ${env.method}`;
      return;
    }

    if (!result.valid) {
      env.err = N.io.BAD_REQUEST;
      return;
    }

    // assign sanitized params to env
    env.params = result.params;

    return N.wire.emit(channel, env)
      .catch(err => {
        env.err = err;
      });
  });
};
