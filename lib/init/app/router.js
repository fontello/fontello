// router intializer
//


'use strict';


/*global underscore, N*/


// 3rd-party
var _       = underscore;
var Pointer = require('pointer');


////////////////////////////////////////////////////////////////////////////////


// walks through `params` options of routes and transforms strings in form of
// inline regexp into real RegExp objects.
//
// works on top-level key/values only and respects route params definition
// structure (see Pointer.Route):
//
// in:  { a: '123',
//        b: '/123/',
//        c: { match: '/123/' },
//        d: { value: '/123/' }
//      }
//
// out: { a: '123',
//        b: /123/,
//        c: { match: /123/ },
//        d: { value: '/123/' }
//      }
//
function prepareParams(obj) {
  var clean = {};

  _.each(obj || {}, function (val, key) {

    if (_.isString(val) && '/' === val[0] && '/' === val.substr(-1)) {
      clean[key] = new RegExp(val.substr(1, val.length - 2));
      return;
    }

    if (!_.isObject(val)) {
      clean[key] = val;
      return;
    }

    clean[key] = {};

    if (_.isString(val.match) && '/' === val.match[0] && '/' === val.match.substr(-1)) {
      clean[key].match = new RegExp(val.match.substr(1, val.match.length - 2));
    } else if (_.isString(val.match)) {
      clean[key].match = new RegExp(val.match);
    }

    if (undefined !== val['default']) {
      clean[key]['default'] = val['default'];
    }
  });

  return clean;
}


// Walks through the config and makes explicit listen and mount keys.
// If apiPath has no `listen` it will take it from it's parent and so on up to
// `default`. Same for `mount`
//
function prepareMountingConfig(config) {
  config['default'] = _.extend({
    listen: '0.0.0.0:3000',
    mount:  '/',
    ssl:    null
  }, config['default']);

  // Returns `attr` value of `the.given.key`, if not found, try it's parent
  // `the.given` up to the root part and if can't find anywhere use `default`.
  //
  function findValue(key, attr) {
    // we have `attr` defined
    if (config[key][attr]) {
      return config[key][attr];
    }

    // no more fallbacks - use default
    if (-1 === key.indexOf('.')) {
      return config['default'][attr];
    }

    // recursively get `attr` of a parent
    return findValue(key.split('.').slice(0, -1).join('.'), attr);
  }

  //
  // walks through the options of config and makes sure, that each option
  // (but `default` or `_`) have listen, ssl and mount values
  //

  _.each(config, function (options, key) {
    if ('_' === key || 'default' === key) {
      // skip special case key
      return;
    }

    options.listen  = findValue(key, 'listen');
    options.ssl     = findValue(key, 'ssl');
    options.mount   = findValue(key, 'mount');
  });

  //
  // make sure all bindings with the same
  // listen addr:port pairs are marked as ssl
  //

  _.each(config, function (options, key) {
    if ('_' === key) {
      // skip special case key
      return;
    }

    // make sure all bindings with the same
    // listen addr:port pairs are marked as ssl
    if (options.listen && options.ssl) {
      _.each(config, function (other) {
        if (other.listen === options.listen) {
          other.ssl = options.ssl;
        }
      });
    }
  });

  return config;
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, sandbox, callback) {
  var
  router_config = N.config.router,
  client_routes = N.runtime.client_routes = [],
  pointer, unknown_methods;

  pointer = N.runtime.router = new Pointer();

  //
  // normalize mounting config
  //

  N.config.bind = prepareMountingConfig(N.config.bind || {});

  //
  // validate routes
  //

  unknown_methods = _.filter(_.keys(router_config.map || {}), function (api_path) {
    return !N.server[api_path];
  });

  if (unknown_methods.length) {
    callback("Router map contains unknown server api methods: " +
             unknown_methods.join(', '));
    return;
  }

  // helper to find a mount point for a given apiPath
  //
  function find_mount_point(apiPath) {
    var options;

    do {
      options = N.config.bind[apiPath];
      apiPath = apiPath.split('.').slice(0, -1).join('.');
    } while (!options && apiPath);

    return (options || N.config.bind['default']).mount;
  }

  //
  // fill in routes
  //

  _.each(router_config.map || {}, function (routes, apiPath) {
    var mount = find_mount_point(apiPath);

    // single slash means no mount point (default mount point)
    if ('/' === mount) {
      mount = null;
    }

    // each apiPath contains 1 or more routes
    _.each(routes, function (params, pattern) {
      var options = {
        name:     apiPath,
        prefix:   mount,
        // cast regexp looking strings into real regexps:
        // { foo: '/bar/' } -> { foo: new RegExp('bar') }
        params:   prepareParams(params),
        meta:     apiPath
      };

      client_routes.push([pattern, options]);
      pointer.addRoute(pattern, options);
    });
  });

  //
  // validate direct invocators
  //

  unknown_methods = _.filter(_.keys(router_config.direct_invocators || {}), function (api_path) {
    return !N.server[api_path];
  });

  if (unknown_methods.length) {
    callback("Direct invocators contains unknown server api methods: " +
             unknown_methods.join(', '));
    return;
  }

  //
  // fill in direct invocators
  //

  _.each(router_config.direct_invocators || {}, function (enabled, apiPath) {
    var mount, pattern, options;

    if (!enabled) {
      // skip disabled invocators
      return;
    }

    mount   = find_mount_point(apiPath);
    pattern = '/!' + apiPath + '(?{query})';

    // single slash means no mount point (default mount point)
    if ('/' === mount) {
      mount = null;
    }

    options = {
      name:   apiPath,
      params: { query: /.*/ },
      prefix: mount,
      meta:   apiPath
    };

    client_routes.push([pattern, options]);
    pointer.addRoute(pattern, options);
  });

  callback();
};
