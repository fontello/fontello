// Prepares request environment (`this` context of server methods/filters).


'use strict';


/**
 *  lib
 **/


//var _       = require('lodash');
var Puncher = require('puncher');
var date    = require('./date');


////////////////////////////////////////////////////////////////////////////////


var tzOffset = (new Date).getTimezoneOffset();


//  deepClone(obj) -> Object
//  - obj (Mixed): Original object to get cloned
//
//  Returns a deep copy of given object. All nested objects are deeply copied
//  instead of passing by reference.
//
//  **WARNING** This is a potentional bottleneck and performance-killer,
//              although it's used for a trivial case. Probably it would be
//              better to change it to `JSON.parse(JSON.stringify(obj))`
//
/*
function deepClone(obj) {
  // TODO: Add preventor of circular dependencies

  if (!_.isObject(obj) || _.isFunction(obj)) {
    return obj;
  }

  if (_.isDate(obj)) {
    return new Date(obj.getTime());
  }

  if (_.isRegExp(obj)) {
    return new RegExp(obj.source, obj.toString().replace(/.*\//, ""));
  }

  if (_.isArray(obj) || _.isArguments(obj)) {
    return Array.prototype.map.call(obj, function (val) {
      return deepClone(val);
    });
  }

  return _.reduce(obj, function (memo, val, key) {
    memo[key] = deepClone(val);
    return memo;
  }, {});
}
*/

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
 *    - **locale**: Locale name as String
 *  - **method**: Name of the server method, e.g. `'forums.posts.show'`
 *  - **layout**: Layout name as String
 **/
module.exports = function env(N, options) {
  var req = options.req
    , res = options.res;

  var ctx = {

    params: options.params || {},
    method: null,

    // Contains server chain response on success
    data: {},

    // internal, to pass error from server chain to responders
    err: null,
    // internal, rendered data
    body: null,
    // internal, http status code (set in responders)
    status: N.io.OK,

    headers: {},

    runtime: {},

    extras:  {
      puncher: new Puncher()
    },

    helpers: {
      asset_path: function asset_path(path) {
        var asset = N.runtime.assets.manifest.assets[path];
        return !asset ? "#" : N.runtime.router.linkTo('assets', { path: asset });
      }
    },

    origin: {
      req: req,
      res: res
    },

    session: options.session || null,

    request: {
      type:       options.type,
      ip:         req.connection.remoteAddress,
      user_agent: req.headers['user-agent'],
      matched:    options.matched || null
    },

    settings: {
      params: {},
      fetch: function fetchSettings(keys, callback) {
        N.settings.get(keys, this.params, {}, callback);
      }
    },

    response: {
      data: {
        layout: null,
        content: null,
        head: {
          title: null, // should be filled with default value

          // List of assets for yepnope,
          // Each element is an object with properties:
          //
          //    type:   css|js
          //    link:   asset_url
          //
          // example: assets.push({type: 'js', link: '//example.com/foo.js'});
          assets: [],

          apiPath: null
        },
        menus: {},
        blocks: {}
      }
    },
    log_request: function () {}
  };

  //
  // env-dependent helper needs to be bounded to env
  //

  ctx.helpers.setLayout = function (apiPath) {
    this.response.layout = apiPath;
  }.bind(ctx);

  ctx.helpers.t = function (phrase, params) {
    var locale = this.runtime.locale || N.config.locales['default'];
    return N.runtime.i18n.t(locale, phrase, params);
  }.bind(ctx);

  ctx.helpers.t.exists = function (phrase) {
    var locale = this.runtime.locale || N.config.locales['default'];
    return N.runtime.i18n.hasPhrase(locale, phrase);
  }.bind(ctx);

  ctx.helpers.date = function (value, format) {
    var locale = this.runtime.locale || N.config.locales['default'];
    return date(value, format, locale, tzOffset);
  }.bind(ctx);

  return ctx;
};
