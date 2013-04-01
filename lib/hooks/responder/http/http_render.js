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
      , view = env.response.view || env.method
      , helpers = _.clone(env.helpers);

    env.headers['Content-Type'] = 'text/html; charset=UTF-8';

    // If HEAD is requested, it's no need for real rendering.
    if ('HEAD' === env.origin.req.method) {
      env.body = null;
      return;
    }

    // Register additional helpers.
    helpers.link_to = function link_to(name, params) {
      return N.runtime.router.linkTo(name, params) || '#';
    };

    helpers.asset_include = function asset_include(path) {
      var asset  = N.runtime.assets.environment.findAsset(path)
        , result = '';

      if (asset) {
        try {
          result = asset.toString();

        } catch (err) {
          N.logger.error('Failed inline asset %s:\n%s'
          , path
          , err.stack || err.message || err
          );
        }
      }

      return result;
    };

    // Expose necessary environment/configuration values.
    data.head.apiPath    = env.method; // e.g. 'forum.index'
    data.runtime         = env.runtime;
    data.enabled_locales = N.config.locales.enabled;

    // Start rendering.
    env.extras.puncher.start('Rendering');

    try {
      env.body = render(N, view, data, helpers);

      if (env.response.layout) {
        env.runtime.layout = env.response.layout;
        data.content       = env.body;

        env.body = render(N, env.response.layout, data, helpers);
      }
    } catch (err) {
      env.err = err;
    }

    env.extras.puncher.stop();
  });
};
