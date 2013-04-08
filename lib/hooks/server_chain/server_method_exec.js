// Executes a server method.


'use strict';


module.exports = function (N) {
  N.wire.on('server_chain:*', function server_method_exec(env, callback) {
    var channel = 'server:' + env.method
      , validator;

    // No channel -> error
    if (!N.wire.has(channel)) {
      callback(N.io.NOT_FOUND);
      return;
    }

    // Time to validate the request.
    validator = N.validate.test(channel, env.params);

    // when method has no validation schema,
    // test() returns `null`, object with `valid` property otherwise
    if (!validator) {
      callback("Params schema is missing for " + env.method);
      return;
    }

    if (!validator.valid) {
      // FIXME: do not list "bad" params on production?
      callback({
        code: N.io.BAD_REQUEST,
        message: "Invalid params:\n" + validator.errors.map(function (err) {
          return "- " + err.property + ' ' + err.message;
        }).join('\n')
      });
      return;
    }

    // Now run server method
    N.wire.emit(channel, env, callback);
  });
};
