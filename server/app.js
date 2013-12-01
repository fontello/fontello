'use strict';


////////////////////////////////////////////////////////////////////////////////

/*
function hash(str) {
  return require('crypto').createHash('md5').update(str).digest('hex');
}
*/

// FIXME: this works for single-process model only.
//        switch to shared cache in future.
//var etag = hash('fontello-app-' + Date.now());


////////////////////////////////////////////////////////////////////////////////

var _           = require('lodash');

module.exports = function (N, apiPath) {
  N.validate(apiPath, {
    sid: {
      type: 'string'
    , required: false
    , pattern: /^[0-9a-f]+/
    }
  });

  // Process standerd GET/HEAD request
  //
  N.wire.on(apiPath, function app(env, callback) {
    // Page cache headers temporary disabled - seems to cause error
    // on assets change, 'must-revalidate' does not help.
    // set headers
    //env.headers['ETag']          = etag;
    //env.headers['Cache-Control'] = 'private, max-age=0, must-revalidate';

    env.res.layout          = 'fontello.layout';

    // if requested page with config id - try te fetch data,
    // and redirect to main on error
    if (env.params.sid) {
      N.models.ShortLink.findOne({ sid: env.params.sid }, function(err, sl) {
        if (err) {
          callback(err);
          return;
        }

        // if shortlink not found - redirect to root
        if (!sl) {
          callback({
            code: N.io.REDIRECT,
            head: { 'Location': '/' }
          });
          return;
        }

        // inject config to runtime & return main page
        env.runtime.page_data = _.pick(sl.toObject(), [ 'config', 'url', 'sid' ]);

        callback();
      });
      return;
    }

    // No params - return main page
    callback();
  });
};
