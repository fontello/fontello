// Build & send font, previously defined by api.put


'use strict';


var fontBuilder = require('./font/_lib/builder');


module.exports = function (N, apiPath) {
  var builder = fontBuilder(N);

  N.validate(apiPath, {
    sid: {
      type: 'string'
    , required: true
    , pattern: /^[0-9a-f]+/
    }
  });

  N.wire.on(apiPath, function app_post(env, callback) {

    N.models.ShortLink.findOne({ sid: env.params.sid }, function(err, sl) {
      if (err) {
        callback(err);
        return;
      }

      // if session id (shortlink) not found - return 404
      if (!sl) {
        callback(N.io.NOT_FOUND);
        return;
      }

      // build font
      builder.buildFont(sl.toObject().config, function(err, info) {
        if (err) {
          callback(err);
          return;
        }

        // reuse `fontello.font.download` method
        env.params.id = info.fontId;
        N.wire.emit('server:fontello.font.download', env);
      });
    });
  });
};
