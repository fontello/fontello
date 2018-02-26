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
  N.wire.on(apiPath, async function api_update(env) {
    let linkData;

    try {
      linkData = await N.shortlinks.get(env.params.sid, { valueEncoding: 'json' });
    } catch (err) {
      // if session id (shortlink) not found - return 404
      if (err.type === 'NotFoundError') throw { code: N.io.NOT_FOUND, message: 'Session expired' };

      throw err;
    }

    linkData.config = env.params.config;

    await N.shortlinks.put(
      env.params.sid,
      linkData,
      { ttl: 6 * 60 * 60 * 1000, valueEncoding: 'json' }
    );
  });
};
