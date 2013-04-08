// Server-side renderer filter.
//


'use strict';


var _      = require('lodash');
var render = require('../../../system/render/common');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {

  // Filter middleware that renders view and required layout and sets
  //
  N.wire.after('responder:http', { priority: 10 }, function http_render(env) {

    // Don't render page on an error.
    if (env.err) {
      return;
    }

    var data = env.response.data
      , view = env.response.view || env.method;

    env.headers['Content-Type'] = 'text/html; charset=UTF-8';

    // If HEAD is requested, it's no need for real rendering.
    if ('HEAD' === env.origin.req.method) {
      env.body = null;
      return;
    }

    // Expose necessary environment/configuration values.
    data.runtime         = env.runtime;
    data.enabled_locales = N.config.locales.enabled;

    // Start rendering.
    env.extras.puncher.start('Rendering');

    try {
      env.body = render(N, view, data, _.extend({
        apiPath: env.method
      }, env.helpers));

      if (env.response.layout) {
        env.runtime.layout = env.response.layout;
        env.body = render(N, env.response.layout, data, _.extend({
          apiPath: env.method
        , content: env.body
        }, env.helpers));
      }
    } catch (err) {
      env.err = err;
    }

    env.extras.puncher.stop();
  });
};
