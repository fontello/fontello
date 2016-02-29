// Inject http security headers into html pages
//

'use strict';


module.exports = function (N) {

  N.wire.after('responder:http', { priority: 15 }, function inject_security_headers(env) {

    // skip JSON requests
    if ((env.origin.req.headers || {})['x-requested-with'] === 'XMLHttpRequest') return;

    if (!/html/.test(env.headers['Content-Type'])) return;

    var security = N.config.security || {};

    [
      'Content-Security-Policy',
      'Content-Security-Policy-Report-Only',
      'X-Content-Security-Policy',
      'X-Frame-Options'
    ].forEach(function (header) {

      if (security[header]) {
        env.headers[header] = security[header].trim();
      }
    });

  });
};
