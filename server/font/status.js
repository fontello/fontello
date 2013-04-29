// Handles requests for font generation status.
//


'use strict';


var fontBuilder = require('../../lib/font_builder');


module.exports = function (N, apiPath) {
  var builder = fontBuilder(N);


  N.validate(apiPath, {
    id: {
      type: 'string'
    , required: true
    }
  });


  N.wire.on(apiPath, function (env, callback) {
    if (builder.getTask(env.params.id)) {
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
        file: file
      });

      callback();
    });
  });
};
