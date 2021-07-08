// Initializes N.router
//


'use strict';


// 3rd-party
const url     = require('url');


// internal
const stopwatch = require('../utils/stopwatch');
const Router    = require('../../router');


////////////////////////////////////////////////////////////////////////////////


const DEFAULT_HTTP_PORT  = 80;
const DEFAULT_HTTPS_PORT = 443;


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
  let clean = {};

  for (let [ key, val ] of Object.entries(obj || {})) {

    if (typeof val === 'string' && val[0] === '/' && val.substr(-1) === '/') {
      clean[key] = new RegExp(val.substr(1, val.length - 2));
      continue;
    }

    if (typeof val !== 'object' || val === null) {
      clean[key] = val;
      continue;
    }

    clean[key] = {};

    if (typeof val.match === 'string' && val.match[0] === '/' && val.match.substr(-1) === '/') {
      clean[key].match = new RegExp(val.match.substr(1, val.match.length - 2));
    } else if (typeof val.match === 'string') {
      clean[key].match = new RegExp(val.match);
    }

    if (typeof val.default !== 'undefined') clean[key].default = val.default;
    if (typeof val.type !== 'undefined') clean[key].type = val.type;
  }

  return clean;
}


// Walks through the config and makes explicit listen and mount keys.
// If apiPath has no `listen` it will take it from it's parent and so on up to
// `default`. Same for `mount`
//
function prepareMountingConfig(config) {
  config.default = Object.assign({
    listen:    '0.0.0.0:3000',
    mount:     '/',
    ssl:       null,
    forwarded: false
  }, config.default);

  // Returns `attr` value of `the.given.key`, if not found, try it's parent
  // `the.given` up to the root part and if can't find anywhere use `default`.
  //
  function findValue(key, attr) {
    // we have `attr` defined
    if (config[key][attr]) return config[key][attr];

    // no more fallbacks - use default
    if (key.indexOf('.') === -1) return config.default[attr];

    // recursively get `attr` of a parent
    return findValue(key.split('.').slice(0, -1).join('.'), attr);
  }

  //
  // walks through the options of config and makes sure, that each option
  // (but `default` or `_`) have listen, ssl and mount values
  //

  for (let [ key, options ] of Object.entries(config)) {
    // skip special case key
    if (key === 'default') continue;

    options.listen    = findValue(key, 'listen');
    options.ssl       = findValue(key, 'ssl');
    options.mount     = findValue(key, 'mount');
    options.forwarded = findValue(key, 'forwarded');
  }

  //
  // walks through mount points and merge with default if host not set
  //
  let mountDefaults = url.parse(config.default.mount, false, true);

  for (let [ key, options ] of Object.entries(config)) {
    if (key === 'default') continue;

    let mount = url.parse(options.mount, false, true);

    // If host already defined - skip
    if (mount.host) continue;

    mount.host = mountDefaults.host;
    mount.protocol = mountDefaults.protocol;
    mount.pathname = (mountDefaults.pathname || '').replace(/^\/|\/$/g, '') + '/' +
                     (mount.pathname || '').replace(/^\/|\/$/g, '');

    options.mount = url.format(mount);

    if (options.mount !== '/') {
      // remove trailing slash
      options.mount = options.mount.replace(/\/$/, '');
    }
  }

  //
  // make sure all bindings with the same
  // listen addr:port pairs are marked as ssl
  //

  for (let options of Object.values(config)) {
    // make sure all bindings with the same
    // listen addr:port pairs are marked as ssl
    if (options.listen && options.ssl) {
      /* eslint-disable max-depth */
      for (let other of Object.values(config)) {
        if (other.listen === options.listen) {
          other.ssl = options.ssl;
        }
      }
    }
  }

  // Normalize all `listen` options to objects with `address` and `port` keys.
  for (let options of Object.values(config)) {
    options.listen = {
      address:  options.listen.split(':')[0],
      port:     Number(options.listen.split(':')[1] || DEFAULT_HTTP_PORT),
      toString() { return this.address + ':' + this.port; }
    };

    if (options.ssl && typeof options.ssl.listen === 'string') {
      options.ssl.listen = {
        address:  options.ssl.listen.split(':')[0],
        port:     Number(options.ssl.listen.split(':')[1] || DEFAULT_HTTPS_PORT),
        toString() { return this.address + ':' + this.port; }
      };
    }
  }

  return config;
}


// Helper to find a mount point for a given apiPath.
//
function findMountPoint(N, apiPath) {
  let options;

  do {
    options = N.config.bind[apiPath];
    apiPath = apiPath.split('.').slice(0, -1).join('.');
  } while (!options && apiPath);

  return (options || N.config.bind.default).mount;
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {
  let timer = stopwatch();
  let routeConfigs = {};
  let unknownMethods = [];

  // Normalize mounting config.
  N.config.bind = prepareMountingConfig(N.config.bind || {});

  // Collect routes.
  for (let [ optionsString, serverMethods ] of Object.entries(N.config.router)) {
    let // e.g. 'http.post.put' => responder: 'http', typesList: ['post','put']
        options   = optionsString.split('.'),
        responder = options[0],
        typesList = options.slice(1);

    if (typesList.length === 0) {
      typesList = [ 'get' ]; // Default.
    }

    if (typesList.indexOf('get') >= 0 && typesList.indexOf('head') === -1) {
      typesList.push('head'); // GET always implies HEAD as well.
    }

    for (let [ apiPath, routes ] of Object.entries(serverMethods)) {
      let mount = findMountPoint(N, apiPath);

      // Single slash means no mount point (default mount point).
      if (mount === '/') {
        mount = null;
      }

      // Check if specified apiPath exists.
      if (!N.wire.has('server:' + apiPath) &&
          !N.wire.has('server_bin:' + apiPath)) {
        unknownMethods.push(apiPath);
      }

      // Each apiPath contains one or more routes.
      for (let [ pattern, params ] of Object.entries(routes)) {
        let config, key = ((mount || '') + pattern);

        // Create a new route config.
        if (!routeConfigs[key]) {
          config = routeConfigs[key] = {
            name:    [],
            prefix:  mount,
            pattern,
            // Cast regexp looking strings into real regexps:
            // { foo: '/bar/' } -> { foo: new RegExp('bar') }
            params:  prepareParams(params),
            meta: {
              responder,
              methods: {}
            }
          };

        // Use an existent route config.
        } else {
          config = routeConfigs[key];

          if (config.meta.responder !== responder) {
            throw 'Router config must not contain routes with multiple responders ' +
                  `on ${pattern} (${config.meta.responder} and ${responder})`;
          }
        }

        if (config.name.indexOf(apiPath) === -1) {
          config.name.push(apiPath);
        }

        for (let type of typesList) config.meta.methods[type] = apiPath;
      }
    }
  }

  if (unknownMethods.length) {
    throw `Router config contains unknown server API methods: ${unknownMethods.join(', ')}`;
  }

  // Expose the result, overriding built-in URL parser in pointer with node.js parser
  N.router = new Router(null, u => url.parse(u, false, true));
  // N.router = new Router(null);

  for (let route of Object.values(routeConfigs)) N.router.addRoute(route);

  N.logger.info(`Loaded routes ${timer.elapsed}`);
};
