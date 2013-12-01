// Inject http security headers into html pages
//

'use strict';


module.exports = function (N) {

  N.wire.after(['responder:http'], function inject_seciruty_headers(env) {

    // skip JSON requests
    if ((env.origin.req.headers || {})['x-requested-with'] === 'XMLHttpRequest') { return; }

    var security = N.config.security || {};

    if (security['X-Content-Security-Policy']) {
      env.headers['Content-Security-Policy'] = security['X-Content-Security-Policy'];
      // for old browsers
      env.headers['X-Content-Security-Policy'] = security['X-Content-Security-Policy'];
    }
    if (security['X-Frame-Options']) {
      env.headers['X-Frame-Options'] = security['X-Frame-Options'];
    }

  });
};
