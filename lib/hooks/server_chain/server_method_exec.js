// Executes a server method.

'use strict';


module.exports = function (N) {

  N.wire.on('server_chain:*', function server_method_exec(env, callback) {

    var channel_wildcard = 'server:' + env.method + ':*' // all responders
      , channel_strict   = 'server:' + env.method + ':' + env.request.type
      , channel = null
      , validator;

    // Quick-hack - search channel
    if (N.wire.has(channel_strict)) {
      channel = channel_strict;
    }
    if (N.wire.has(channel_wildcard)) {
      channel = channel_wildcard;
    }

    // No channel -> error
    if (!channel) {
      callback(N.io.NOT_FOUND);
      return;
    }

    //
    // Time to validate the request.
    //

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
    N.wire.emit(channel_strict, env, function (err) {
      callback(err);
    });
  });
};
