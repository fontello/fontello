// Server-side renderer filter.
//


'use strict';


var _      = require('lodash');
var render = require('../../../../system/render/common');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {

  // Filter middleware that renders view and required layout and sets
  //
  N.wire.after('responder:http', { priority: 10 }, function http_render(env) {

    // Don't render page on an error.
    if (env.err) return;

    // Don't try to render page if body already provided.
    if (env.body !== null) return;

    var res = env.res,
        view = env.res.view || env.method,
        headers = env.origin.req.headers || {};

    // if no template found - force reply as for json request
    if (!_.has(N.views, view)) {
      headers['x-requested-with'] = 'XMLHttpRequest';
    }

    // Don't render on JSON requests, just setup headers
    if (headers['x-requested-with'] === 'XMLHttpRequest') {
      env.headers['Content-Type'] = 'application/json';
      env.body =  (env.origin.req.method === 'HEAD') ? null : JSON.stringify(env.res);
      return;
    }

    // Continue with standard http rendering

    env.headers['Content-Type'] = 'text/html; charset=UTF-8';

    // Expose necessary environment/configuration values.
    res.enabled_locales = N.config.locales;

    // Start rendering.

    // Additional variables for layout.
    // Fill here until we find better place.
    var layout_locals = {
      // Header injection, directly after loader code
      inject_headers: (N.config.options && N.config.options.inject_headers) || []
    };


    try {
      env.body = render(N, view, res, _.assign({
        runtime: env.runtime,
        apiPath: env.method
      }, env.helpers));

      if (env.res.layout) {
        env.runtime.layout = env.res.layout;
        env.body = render(N, env.res.layout, res, _.assign({
          runtime: env.runtime,
          apiPath: env.method,
          content: env.body
        }, env.helpers, layout_locals));
      }
    } catch (err) {
      env.err = err;
    }
  });
};
