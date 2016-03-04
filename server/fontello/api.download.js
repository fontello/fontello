// Build & send font, previously defined by api.put
//
'use strict';


const fontBuilder = require('./font/_lib/builder');


module.exports = function (N, apiPath) {
  const builder = fontBuilder(N);


  N.validate(apiPath, {
    sid: { type: 'string', required: true, pattern: /^[0-9a-f]+/ }
  });


  N.wire.on(apiPath, function* app_post(env) {
    let sl = yield N.models.ShortLink.findOne({ sid: env.params.sid }).lean(true);

    // if session id (shortlink) not found - return 404
    if (!sl) throw N.io.NOT_FOUND;

    // build font
    let info = yield builder.buildFont(sl.config);

    // reuse `fontello.font.download` method
    env.params.id = info.fontId;
    yield N.wire.emit('server:fontello.font.download', env);
  });
};
