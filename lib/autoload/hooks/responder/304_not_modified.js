// Check ETag & Generates 304 response if needed
//

'use strict';


module.exports = function (N) {

  N.wire.after(['responder:http', 'responder:rpc'], { priority: 5 }, function not_modified_304_check(env, callback) {

    // Do nothing on error
    if (env.err) {
      callback();
      return;
    }

    //
    // If requested & generated ETag match, then create 304 reply
    // 304 Not Modified
    //
    // If you ever deside to build ETag, don't forget Cache-Control header
    //

    var headers = env.headers;

    if (headers['ETag'] && headers['ETag'] === env.origin.req.headers['if-none-match']) {
      env.err = N.io.NOT_MODIFIED;
    }

    callback();
    return;
  });
};
