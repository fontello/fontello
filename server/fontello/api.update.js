// Update session `sid` with client `config`


'use strict';


module.exports = function (N, apiPath) {
  N.validate(apiPath, {
    sid: {
      type: 'string'
    , required: true
    , pattern: /^[0-9a-f]+/
    }
  , config: {
      type: 'object'
    , required: true
    }
  });

  N.wire.on(apiPath, function api_update(env, callback) {

    N.models.ShortLink.findOne({ sid: env.params.sid }, function(err, sl) {
      if (err) {
        callback(err);
        return;
      }

      if (!sl) {
        callback('Session expired');
        return;
      }

      sl.config = env.params.config;

      sl.save(function (err) {
        if (err) {
          callback(err);
          return;
        }

        callback();
      });
    });
  });
};