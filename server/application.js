"use strict";


////////////////////////////////////////////////////////////////////////////////


function hash(str) {
  return require('crypto').createHash('md5').update(str).digest('hex');
}


////////////////////////////////////////////////////////////////////////////////


// FIXME: this works for single-process model only.
//        switch to shared cache in future.
var etag = hash('fontello-app-' + Date.now());


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N, apiPath) {
  N.validate(apiPath, {});


  N.wire.on(apiPath, function app(env, callback) {
    if ('http' !== env.request.type) {
      callback('HTTP only');
      return;
    }

    // set headers
    env.headers['ETag']          = etag;
    env.headers['Cache-Control'] = 'private, max-age=0, must-revalidate';
    env.response.layout          = 'fontello.layout';

    // done
    callback();
  });
};
