// Prepares request environment (`this` context of server methods/filters).


'use strict';


/**
 *  lib
 **/


/*global N*/


////////////////////////////////////////////////////////////////////////////////


/**
 *  lib.env(options) -> Object
 *  - options (Object): Environment options.
 *
 *  Create new request environment object.
 *
 *
 *  ##### Options
 *
 *  - **http**: HTTP origin object that contains `req` and `res`.
 *  - **rpc**: API3 (Ajax) origin that contains `req` and `res`.
 *  - **skip**: Array of middlewares to skip
 *  - **session**: Session object
 *    - **theme**: Theme name as String
 *    - **locale**: Locale name as String
 *  - **method**: Name of the server method, e.g. `'forums.posts.show'`
 *  - **layout**: Layout name as String
 **/
module.exports = function env(options) {
  var ctx = {
    extras:  {},
    helpers: {
      asset_path: function asset_path(path) {
        var asset = N.runtime.assets.manifest.assets[path];
        return !asset ? "#" : ("/assets/" + asset);
      }
    },
    origin: {
      http: options.http,
      rpc: options.rpc
    },
    skip: (options.skip || []).slice(),
    // FIXME: should be filled by session middleware
    session: options.session || {
      theme:  'desktop',
      locale: N.config.locales['default']
    },
    request: {
      // FIXME: should be deprecated in flavour of env.origin
      origin:     !!options.rpc ? 'RPC' : 'HTTP',
      method:     options.method,
      namespace:  String(options.method).split('.').shift()
    },
    data: {},
    runtime: {},
    response: {
      data: {
        head: {
          title: null, // should be filled with default value
          apiPath: options.method,
          // List of assets for yepnope,
          // Each element is an object with properties:
          //
          //    type:   css|js
          //    link:   asset_url
          //
          // example: assets.push({type: 'js', link: '//example.com/foo.js'});
          assets: []
        },
        menus: {},
        widgets: {}
      },
      headers: {},
      // Layouts are supporting "nesting" when speciefied as arrays:
      //
      //    [ 'default', 'default.blogs' ]
      //
      // In the example above, `default.blogs` will be rendered first and the
      // result will be provided for rendering to `default`.
      layout: options.layout || 'layouts.default',
      view: options.method
    }
  };

  //
  // env-dependent helper needs to be bounded to env
  //

  ctx.helpers.t = function (phrase, params) {
    return N.runtime.i18n.t(this.session.locale, phrase, params);
  }.bind(ctx);

  return ctx;
};
