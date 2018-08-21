// RPC reply serializer, that should heppen in the end,
// because we pass errors in serialized form too
//


'use strict';


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {

  N.wire.after('responder:rpc', { priority: 90 }, function rpc_serialize(env) {

    // Set Content-Type and charset (override existing)
    env.headers['Content-Type'] = 'application/json; charset=UTF-8';

    // Status is always ok - errors are embedded into payload
    env.status = N.io.OK;

    // Replace body with serialized payload
    env.body = JSON.stringify({
      assets_hash: N.assets_hash,
      error: env.err,
      res: env.err ? null : env.res
    });
  });
};
