// Build & send font, previously defined by api.put
//
'use strict';


const Promise = require('bluebird');


module.exports = function (N, apiPath) {

  N.validate(apiPath, {
    sid: { type: 'string', required: true, pattern: /^[0-9a-f]+/ }
  });


  N.wire.on(apiPath, function* app_post(env) {
    let sl = yield Promise.fromCallback(cb => N.shortlinks.get(
      env.params.sid,
      { valueEncoding: 'json' },
      cb
    ));

    // if session id (shortlink) not found - return 404
    if (!sl) throw N.io.NOT_FOUND;

    let params = { config: sl.config };

    // build font
    yield N.wire.emit('internal:fontello.font_build', params);

    // reuse `fontello.font.download` method
    env.params.id = params.fontId;
    yield N.wire.emit('server:fontello.font.download', env);
  });
};
