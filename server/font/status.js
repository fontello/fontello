// Handles requests for font generation status.
//


'use strict';


var fontBuilder = require('./_lib/font_builder');


module.exports = function (N, apiPath) {
  var builder = fontBuilder(N);

  N.validate(apiPath, {
    id: {
      type: 'string'
    , required: true
    , pattern: /^[0-9a-f]{32}$/
    }
  });


  N.wire.on(apiPath, function (env, callback) {

    builder.checkFont(env.params.id, function (err, result) {
      if (err) {
        callback(err);
        return;
      }

      // font in queue
      if (!result || result.pending) {
        env.response.data.status = 'enqueued';
        callback();
        return;
      }

      // font not found both in queue and on disk
      if (!result.file) {
        env.response.data.status = 'error';
        env.response.error = 'Unknown font id (probably task crashed, try again).';
        callback();
        return;
      }

      // font ready
      env.response.data.status = 'finished';
      env.response.data.url = N.runtime.router.linkTo('fontello.font.download', {
        id: env.params.id
      });

      callback();
    });
  });
};
