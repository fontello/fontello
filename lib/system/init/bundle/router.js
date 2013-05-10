// Initializes N.runtime.router
//


'use strict';


// 3rd-party
var _       = require('lodash');
var Pointer = require('pointer');


// internal
var stopwatch = require('../utils/stopwatch');


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


// Helper to find a mount point for a given apiPath.
//
function findMountPoint(apiPath) {
  var options;

  do {
    options = N.config.bind[apiPath];
    apiPath = apiPath.split('.').slice(0, -1).join('.');
  } while (!options && apiPath);

  return (options || N.config.bind['default']).mount;
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (sandbox) {
  var N     = sandbox.N
    , timer = stopwatch()
    , routeConfigs   = {}
    , unknownMethods = [];

  // Normalize mounting config.
  N.config.bind = prepareMountingConfig(N.config.bind || {});

  // Collect routes.
  _.forEach(N.config.router, function (serverMethods, optionsString) {
    var // e.g. 'http.post.put' => responder: 'http', typesList: ['post','put']
        options   = optionsString.split('.')
      , responder = options[0]
      , typesList = options.slice(1);

    if (_.isEmpty(typesList)) {
      typesList = ['get']; // Default.
    }

    _.forEach(serverMethods, function (routes, apiPath) {
      var mount = findMountPoint(apiPath);

      // Single slash means no mount point (default mount point).
      if ('/' === mount) {
        mount = null;
      }

      // Check if specified apiPath exists.
      if (!N.wire.has('server:' + apiPath) &&
          !N.wire.has('server_bin:' + apiPath)) {
        unknownMethods.push(apiPath);
      }

      // Each apiPath contains one or more routes.
      _.forEach(routes, function (params, pattern) {
        var config, key = ((mount || '') + pattern);

        // Create a new route config.
        if (!_.has(routeConfigs, key)) {
          config = routeConfigs[key] = {
            name:    []
          , prefix:  mount
          , pattern: pattern
            // Cast regexp looking strings into real regexps:
            // { foo: '/bar/' } -> { foo: new RegExp('bar') }
          , params:  prepareParams(params)
          , meta: {
              responder: responder
            , methods: {}
            }
          };

        // Use an existent route config.
        } else {
          config = routeConfigs[key];

          if (config.meta.responder !== responder) {
            throw 'Router config must not contain routes with multiple ' +
                  'responders on ' + pattern + ' (' + config.meta.responder +
                  ' and ' + responder + ')';
          }
        }

        if (!_.contains(config.name, apiPath)) {
          config.name.push(apiPath);
        }

        _.forEach(typesList, function (type) {
          config.meta.methods[type] = apiPath;
        });
      });
    });
  });

  if (!_.isEmpty(unknownMethods)) {
    throw 'Router config contains unknown server API methods: ' +
          unknownMethods.join(', ');
  }

  // Expose the result.
  N.runtime.router = new Pointer();
  N.runtime.client_routes = [];

  _.forEach(routeConfigs, function (config) {
    N.runtime.router.addRoute(config);
    N.runtime.client_routes.push(config);
  });

  N.logger.info('Processed routes %s', timer.elapsed);
};
