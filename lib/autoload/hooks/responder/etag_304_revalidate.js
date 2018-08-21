// Add Etags, 304 responses, and force revalidate for each request
//
// - Should help with nasty cases, when quick page open use old
//   assets and show errors until Ctrl+F5
// - Still good enougth for user, because 304 responses supported
//
'use strict';

const crypto = require('crypto');


module.exports = function (N) {
  N.wire.after([ 'responder:http', 'responder:rpc' ], { priority: 95 }, function etag_304_revalidate(env) {

    // Quick check if we can intrude
    if (env.status !== 200) return;
    if (!env.body) return;
    if (typeof env.body !== 'string' && !Buffer.isBuffer(env.body)) return;
    if (env.headers['ETag'] || env.headers['Cache-Control']) return;

    // Fill Etag/Cache-Control headers
    let etag = '"' + crypto.createHash('sha1').update(env.body).digest('base64').substring(0, 27) + '"';

    env.headers['ETag'] = etag;
    env.headers['Cache-Control'] = 'max-age=0, must-revalidate';

    // Replace responce status if possible
    if (etag === env.origin.req.headers['if-none-match']) {
      env.status = N.io.NOT_MODIFIED;
      env.body = null;
    }
  });
};
