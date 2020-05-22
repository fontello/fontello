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
    let channel = 'server:' + env.method;

    // No channel -> error
    if (!N.wire.has(channel)) throw N.io.NOT_FOUND;

    // Time to validate the request.
    let result = N.validate.process(channel, env.params);

    // when method has no validation schema,
    // test() returns `null`, object with `valid` property otherwise
    if (!result) throw `Params validator not found for ${env.method}`;

    if (!result.valid) {
      if (N.environment === 'development') {
        throw { code: N.io.BAD_REQUEST, message: invalidParamsInfo(result.errors) };
      }

      throw N.io.BAD_REQUEST;
    }

    // assign sanitized params to env
    env.params = result.params;

    // Now run server method
    return N.wire.emit(channel, env);
  });
};
