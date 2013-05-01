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
    builder.findTask(env.params.id, function (err, task) {
      if (err) {
        env.response.data.status = 'error';
        callback();
        return;
      }

      if (task) {
        env.response.data.status = 'enqueued';
        callback();
        return;
      }

      builder.checkResult(env.params.id, function (file) {
        if (!file) {
          // job not found
          env.response.data.status = 'error';
          env.response.error = 'Unknown font id (probably task crashed, try again).';
          callback();
          return;
        }

        // job done
        env.response.data.status = 'finished';
        env.response.data.url = N.runtime.router.linkTo('fontello.font.download', {
          id: env.params.id
        });
        callback();
      });
    });
  });
};
