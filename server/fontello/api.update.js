// Update session `sid` with client `config`
//
'use strict';


const config_schema = require('./font/_lib/config_schema');


module.exports = function (N, apiPath) {

  N.validate(apiPath, {
    sid:    { type: 'string', required: true, pattern: /^[0-9a-f]+/ },
    config: config_schema
  });


  // Update session with client config
  //
  N.wire.on(apiPath, function* api_update(env) {
    let sl = yield N.models.ShortLink.findOne({ sid: env.params.sid });

    // if session id (shortlink) not found - return 404
    if (!sl) throw 'Session expired';

    sl.config = env.params.config;

    yield sl.save();
  });
};
