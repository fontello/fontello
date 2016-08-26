// Update session `sid` with client `config`
//
'use strict';


const config_schema = require('./font/_lib/config_schema');
const Promise       = require('bluebird');


module.exports = function (N, apiPath) {

  N.validate(apiPath, {
    sid:    { type: 'string', required: true, pattern: /^[0-9a-f]+/ },
    config: config_schema
  });


  // Update session with client config
  //
  N.wire.on(apiPath, function* api_update(env) {
    let linkData = yield Promise.fromCallback(cb => N.shortlinks.get(
      env.params.sid,
      { valueEncoding: 'json' },
      cb
    ));

    // if session id (shortlink) not found - return 404
    if (!linkData) throw 'Session expired';

    linkData.config = env.params.config;

    yield Promise.fromCallback(cb => N.shortlinks.put(
      env.params.sid,
      linkData,
      { ttl: 6 * 60 * 60 * 1000, valueEncoding: 'json' },
      cb
    ));
  });
};
