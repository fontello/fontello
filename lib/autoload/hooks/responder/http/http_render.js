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
    if (env.err) {
      return;
    }

    var res = env.res
      , view = env.method
      , headers = env.origin.req.headers || {};

    // if no template found - force reply as for json request
    if (!_.has(N.views, view)) {
      headers['x-requested-with'] = 'XMLHttpRequest';
    }

    // Don't render on JSON requests, just setup headers
    if (headers['x-requested-with'] === 'XMLHttpRequest') {
      env.headers['Content-Type'] = 'application/json';
      env.body =  ('HEAD' === env.origin.req.method) ? null : JSON.stringify(env.res);
      return;
    }

    // Continue with standard http rendering

    env.headers['Content-Type'] = 'text/html; charset=UTF-8';

    // If HEAD is requested, it's no need for real rendering.
    if ('HEAD' === env.origin.req.method) {
      env.body = null;
      return;
    }

    // Expose necessary environment/configuration values.
    res.enabled_locales = N.config.locales.enabled;

    // Start rendering.
    env.extras.puncher.start('rendering');

    // Additional variables for layout.
    // Fill here until we find better place.
    var layout_locals = {
      // Header injection, directly after loader code
      inject_header: (N.config.options && N.config.options.inject_header) || ''
    };


    try {
      env.body = render(N, view, res, _.extend({
        runtime: env.runtime
      , apiPath: env.method
      }, env.helpers));

      if (env.res.layout) {
        env.runtime.layout = env.res.layout;
        env.body = render(N, env.res.layout, res, _.extend({
          runtime: env.runtime
        , apiPath: env.method
        , content: env.body
        }, env.helpers, layout_locals));
      }
    } catch (err) {
      env.err = err;
    }

    env.extras.puncher.stop();
  });
};
