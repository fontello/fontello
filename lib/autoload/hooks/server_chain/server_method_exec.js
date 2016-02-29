// Executes a server method.


'use strict';


function invalidParamsInfo(errors) {

  var details = errors.map(function (err) {
    return `- ${err.field} ${err.message} (${err.value})`;
  });

  return [ 'Invalid params:' ].concat(details).join('\n');
}


module.exports = function (N) {
  N.wire.on('server_chain:*', function server_method_exec(env) {
    var channel = 'server:' + env.method,
        validator;

    // No channel -> error
    if (!N.wire.has(channel)) throw N.io.NOT_FOUND;

    // Time to validate the request.
    validator = N.validate.test(channel, env.params);

    // when method has no validation schema,
    // test() returns `null`, object with `valid` property otherwise
    if (!validator) throw `Params validator not found for ${env.method}`;

    if (!validator.valid) {
      if (N.environment === 'development') {
        throw { code: N.io.BAD_REQUEST, message: invalidParamsInfo(validator.errors) };
      }

      throw N.io.BAD_REQUEST;
    }

    // Now run server method
    return N.wire.emit(channel, env);
  });
};
