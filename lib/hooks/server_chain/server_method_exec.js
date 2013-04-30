// Executes a server method.


'use strict';


function invalidParamsInfo(errors) {
  var result = [];

  result.push('Invalid params:');

  errors.forEach(function (err) {
    result.push('- ' + err.property + ' ' + err.message);
  });

  return result.join('\n');
}


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
      if ('development' === N.runtime.env) {
        callback({ code: N.io.BAD_REQUEST, message: invalidParamsInfo(validator.errors) });
      } else {
        callback(N.io.BAD_REQUEST);
      }
      return;
    }

    // Now run server method
    N.wire.emit(channel, env, callback);
  });
};
