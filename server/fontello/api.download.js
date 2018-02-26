// Build & send font, previously defined by api.put
//
'use strict';


module.exports = function (N, apiPath) {

  N.validate(apiPath, {
    sid: { type: 'string', required: true, pattern: /^[0-9a-f]+/ }
  });


  N.wire.on(apiPath, async function app_post(env) {
    let sl;

    try {
      sl = await N.shortlinks.get(env.params.sid, { valueEncoding: 'json' });
    } catch (err) {
      // if session id (shortlink) not found - return 404
      if (err.type === 'NotFoundError') throw N.io.NOT_FOUND;

      throw err;
    }

    let params = { config: sl.config };

    // build font
    await N.wire.emit('internal:fontello.font_build', params);

    // reuse `fontello.font.download` method
    env.params.id = params.fontId;
    await N.wire.emit('server:fontello.font.download', env);
  });
};
