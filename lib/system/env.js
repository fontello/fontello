// Prepares request environment (`this` context of server methods/filters).


'use strict';


var _       = require('lodash');
var Puncher = require('puncher');
var date    = require('./date');


////////////////////////////////////////////////////////////////////////////////


var DEFAULT_HTTP_PORT  = 80;
var DEFAULT_HTTPS_PORT = 443;


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


// Finds the most appropriate server binding in config, by ApiPath.
//
// Probably, can be cached (if use _.memoize, swap params first)
function findServerSocketConfig(N, apiPath) {
  var splitted = apiPath.split('.'), bind;

  // Reduce apiPath looking for matching binds.
  while (!_.isEmpty(splitted)) {
    bind = N.config.bind[splitted.join('.')];

    if (bind) {
      return bind; // Found.
    }

    splitted.pop();
  }

  return N.config.bind['default'] || null;
}


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
    // filled by formidable with `fields & `files` structures, for http POST requests
    post: null,

    headers: {},

    runtime: {
      page_data: {}
    },

    extras:  {
      puncher: new Puncher(),
      settings: {
        params: {},
        fetch: function fetchSettings(keys, callback) {
          N.settings.get(keys, this.params, {}, callback);
        }
      }
    },

    helpers: {},

    origin: {
      req: req,
      res: res
    },

    session: options.session || null,

    req: {
      type:        options.type,
      isEncrypted: options.isEncrypted,
      ip:          options.remoteAddress,
      matched:     options.matched || null
    },

    res: {
      head: {
        title: null, // should be filled with default value

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
      blocks: {}
    },
    log_request: function () {}
  };


  function resolveI18nPath(path) {
    if ('@' === path.charAt(0)) {
      // absolute
      return path.slice(1);
    } else {
      // relative
      return ctx.method + '.' + path;
    }
  }

  // Server-only helper closures.
  //
  ctx.t = function translate_helper(phrase, params) {
    var locale = ctx.runtime.locale || N.config.locales['default'];

    return N.runtime.i18n.t(locale, resolveI18nPath(phrase), params);
  };

  ctx.t.exists = function translate_exists_helper(phrase) {
    var locale = ctx.runtime.locale || N.config.locales['default'];

    return N.runtime.i18n.hasPhrase(locale, resolveI18nPath(phrase));
  };

  // Server and render helper closures.
  //
  ctx.helpers.set_layout = function set_layout_helper(layout) {
    ctx.res.layout = layout;
  };

  ctx.helpers.link_to = function link_to_helper(name, params) {
    return N.runtime.router.linkTo(name, params) || '#';
  };

  // Constructs full URL using current env and N.config.bind
  //
  ctx.helpers.url_to = function url_to_helper(apiPath, params, linkDefaults) {
    // Reconstruct linkDefaults to prevent side-effects.
    linkDefaults = _.pick(linkDefaults || {}, 'protocol', 'hostname', 'port');

    // Detect protocol.
    if (!linkDefaults.protocol) {
      linkDefaults.protocol = ctx.req.isEncrypted ? 'https' : 'http';
    }

    // Detect hostname.
    if (!linkDefaults.hostname && ctx.origin.req.headers['host']) {
      linkDefaults.hostname = ctx.origin.req.headers['host'].split(':')[0];
    }

    var bind = findServerSocketConfig(N, apiPath);

    // Detect port.
    if (bind && !linkDefaults.port) {
      if ('https' === linkDefaults.protocol) {
        // For encrypted HTTPS connection.
        if (bind.ssl.forwarded || DEFAULT_HTTPS_PORT === bind.ssl.listen.port) {
          linkDefaults.port = null; // Do not set default port explicitly.
        } else {
          linkDefaults.port = bind.ssl.listen.port;
        }
      } else {
        // For plain HTTP connection.
        if (bind.forwarded || DEFAULT_HTTP_PORT === bind.listen.port) {
          linkDefaults.port = null; // Do not set default port explicitly.
        } else {
          linkDefaults.port = bind.listen.port;
        }
      }
    }

    return N.runtime.router.linkTo(apiPath, params, linkDefaults);
  };

  ctx.helpers.asset_path = function asset_path_helper(path) {
    var asset = N.runtime.assets.manifest.assets[path];

    return asset ? N.runtime.router.linkTo('core.assets', { path: asset }) : '#';
  };

  ctx.helpers.asset_include = function asset_include_helper(path) {
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

  ctx.helpers.t = function translate_helper(phrase, params) {
    var locale = ctx.runtime.locale || N.config.locales['default'];

    return N.runtime.i18n.t(locale, phrase, params);
  };

  ctx.helpers.t.exists = function translate_exists_helper(phrase) {
    var locale = ctx.runtime.locale || N.config.locales['default'];

    return N.runtime.i18n.hasPhrase(locale, phrase);
  };

  ctx.helpers.date = function date_helper(value, format) {
    var locale = ctx.runtime.locale || N.config.locales['default'];

    return date(value, format, locale, tzOffset);
  };

  ctx.helpers.add_raw_data = function add_raw_data_helper(key, data) {
    if (ctx.runtime.page_data.hasOwnProperty(key)) {
      N.logger.warn('Override of %j key in env.runtime.page_data');
    }

    ctx.runtime.page_data[key] = data;
  };


  // Resulting `env` object.
  return ctx;
};
