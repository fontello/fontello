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


const _ = require('lodash');


module.exports = function (N, apiPath) {

  N.validate(apiPath, {
    sid: { type: 'string', required: false, pattern: /^[0-9a-f]+/ }
  });


  // Process standerd GET/HEAD request
  //
  N.wire.on(apiPath, function* app(env) {
    // Page cache headers temporary disabled - seems to cause error
    // on assets change, 'must-revalidate' does not help.
    // set headers
    //env.headers['ETag']          = etag;
    //env.headers['Cache-Control'] = 'private, max-age=0, must-revalidate';
    env.res.layout = 'fontello.layout';

    // No params - return main page
    if (!env.params.sid) return;

    // if requested page with config id - try te fetch data,
    // and redirect to main on error
    let sl = yield N.models.ShortLink.findOne({ sid: env.params.sid }).lean(true);

    // if shortlink not found - redirect to root
    if (!sl) throw { code: N.io.REDIRECT, head: { Location: '/' } };

    // inject config to runtime & return main page
    env.runtime.page_data = _.pick(sl, [ 'config', 'url', 'sid' ]);
  });
};
