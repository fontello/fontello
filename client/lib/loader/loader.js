/*eslint-disable no-alert, object-shorthand*/

'$$ asset_body("lie/dist/lie.polyfill") $$';
'$$ asset_body("bagjs") $$';

(function (window) {
  'use strict';

  // Needed because we can't enable only `global` in browserify. Used by Faye.
  window.global = window.global || window;

  //////////////////////////////////////////////////////////////////////////////
  // features testing & setup no-cookies/no-js styles
  //

  function testCookies() {
    if (navigator.cookieEnabled) return true; // Quick test

    document.cookie = 'cookietest=1';
    var ret = document.cookie.indexOf('cookietest=') !== -1;
    document.cookie = 'cookietest=1; expires=Thu, 01-Jan-1970 00:00:01 GMT';
    return ret;
  }

  var docElement = document.documentElement,
      className = docElement.className;

  className = className.replace('no-js', '');
  className += ' js';
  className += testCookies() ? '' : ' no-cookies';
  className = className
                .replace(/^\s+/, '')
                .replace(/\s+$/, '')
                .replace(/\s+/g, ' ');

  docElement.className = className;

  //////////////////////////////////////////////////////////////////////////////

  var NodecaLoader = window.NodecaLoader = { booted: false };
  var alert = window.alert;
  var prelude = '$$ asset_body("browser-pack/prelude.js") $$';
  var require = prelude({}, {}, []);


  NodecaLoader.wrap = function (modules, cache, entry) {
    require = prelude(modules, cache, entry);
  };


  // Simple cross-browser `forEach` iterator for arrays.
  function forEach(array, iterator) {
    for (var index = 0; index < array.length; index += 1) {
      iterator(array[index], index);
    }
  }

  // Simple cross-browser replacement for `Array.reduce`
  function reduce(array, iterator, value) {
    for (var index = 0; index < array.length; index += 1) {
      value = iterator(value, array[index]);
    }

    return value;
  }

  // Remove duplicates from an array preserving the order of the elements
  function uniq(array) {
    var result = [];

    forEach(array, function (item) {
      if (result.indexOf() === -1) result.push(item);
    });

    return result;
  }

  function has(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }

  // Cached non-operable function.
  function noop() {}


  // Mapping of package names to package metadata for all available packages at
  // the currect locale. The metadata is an object consists of three keys:
  //
  //   `js`            - URL to bundle, containing this package's JS
  //   `css`           - URL to bundle, containing this package's CSS
  //   `packagesQueue` - sorted list of dependencies, including this
  //                     package (just list of package names)
  //
  // This variable is initialized by `loadAssets.init()`.
  var assets;


  // Track loaded URLs (as keys, values are just `true`)
  var loaded = {};


  // Sandbox object passed as an argument to each module.
  // It should be filled via `NodecaLoader.execute`.
  var N = { loader: NodecaLoader };

  // For easy debugging only.
  NodecaLoader.N = N;

  // Returns route match data for the given method (e.g. GET) on the given URL
  // or null if none is found. Requires N to be initialized.
  function findRoute(url, method) {
    var matchArray = N.router.matchAll(url),
        match,
        index,
        length;

    for (index = 0, length = matchArray.length; index < length; index += 1) {
      match = matchArray[index];

      if (has(match.meta.methods, method)) return match;
    }

    // Not found.
    return null;
  }

  // Storage of registered client modules.
  // Keys are API paths like 'app.method.submethod'
  var clientModules = {};

  function registerClientModule(apiPath, func) {
    if (has(clientModules, apiPath) && clientModules[apiPath].initialized) return;

    var module = clientModules[apiPath] = {
      initialized: true,
      func: func,
      internal: { exports: {}, apiPath: apiPath }
    };

    /*eslint-disable no-use-before-define*/
    initSingleClientModule(module);
  }

  // Initialize client module. Used once per module.
  function initSingleClientModule(module) {
    function resolveI18nPath(path) {
      if (path.charAt(0) === '@') return path.slice(1);
      return module.internal.apiPath + '.' + path;
    }

    // Local `t` (translate) function for use only within this module.
    // It allows to use phrase strings relative to the module's API path.
    function translationHelper(phrase, params) {
      return N.runtime.t(resolveI18nPath(phrase), params);
    }

    translationHelper.exists = function translationExistsHelper(phrase) {
      return N.runtime.t.exists(resolveI18nPath(phrase));
    };

    // Execute the module's `func` function. It will populate the exports. Require
    // function passed through `NodecaLoader.wrap()`.
    module.func.call(
      window, // this object
      N,
      module.internal.exports,
      module.internal,
      translationHelper
    );
  }


  // Really needed export.
  NodecaLoader.registerClientModule = registerClientModule;

  //
  // Configure `bag.js` loader
  //
  var bag = new window.Bag({
    timeout: 20000,
    stores: [ 'indexeddb', 'websql' ]
  });

  // Load a package with all of its associated assets and dependencies.
  // `preload` parameter is an optional array of URLs which are needed to load
  // before the given package.
  function loadAssets(pkgNames, preload) {
    var resources = [];
    var scheduled = {};
    var loadQueue = [];

    pkgNames = Array.isArray(pkgNames) ? pkgNames : [ pkgNames ];

    if (!pkgNames.length) {
      return Promise.resolve();
    }

    for (var i = 0; i < pkgNames.length; i++) {
      if (!assets[pkgNames[i]]) {
        return Promise.reject(new Error('Unknown package (' + pkgNames[i] + ')'));
      }

      loadQueue = loadQueue.concat(assets[pkgNames[i]].packagesQueue.slice(0).reverse());
    }

    loadQueue = uniq(loadQueue);

    forEach(loadQueue, function (dependency) {
      var alreadyLoaded, pkgDist = assets[dependency];

      if (pkgDist.css.length) {
        alreadyLoaded = reduce(pkgDist.css, function (acc, css) {
          return acc || loaded[css] || scheduled[css];
        }, false);

        if (!alreadyLoaded) {
          resources.unshift(pkgDist.css[0]);
          scheduled[pkgDist.css[0]] = true;
        }
      }

      if (pkgDist.js.length) {
        alreadyLoaded = reduce(pkgDist.js, function (acc, js) {
          return acc || loaded[js] || scheduled[js];
        }, false);

        if (!alreadyLoaded) {
          resources.unshift(pkgDist.js[0]);
          scheduled[pkgDist.js[0]] = true;
        }
      }
    });

    // Copy the preload array to allow pushing without side-effects.
    if (preload) {
      resources = preload.concat(resources);
    }

    if (!resources.length) return Promise.resolve();

    var res_list = [];
    forEach(resources, function (url) {
      res_list.push({
        url: url,
        // storage key = file path without hash
        key: url.replace(/-[0-9a-f]{32}([.][a-z]+)$/, '$1')
      });
    });

    return bag.require(res_list)
      .then(null, function (err) {
        throw new Error('Asset load error (bag.js): ' + (err.message || err));
      })
      .then(function () {
        forEach(resources, function (url) {
          loaded[url] = true;
        });

        // initClientModules();

        if (!N.wire) {
          throw new Error('Asset load error: "N.Wire" unavailable after asset load.');
        }

        return N.wire.emit('init:assets', {}).then(null, function (err) {
          throw new Error('Asset load error: "init:assets" failed. ' + (err.message || err));
        });
      });
  }


  // Loads all necessary shims and libraries and assets for given package.
  loadAssets.init = function init(assetsMap, pkgName, shims) {
    shims = shims || [];

    // Set internal assets map.
    assets = assetsMap;

    // Init can be called only once.
    loadAssets.init = noop;

    // Mark all stylesheets of the given package as loaded, since they are
    // included to head of the page.
    forEach(assets[pkgName].packagesQueue, function (dependency) {
      forEach(assets[dependency].css, function (file) {
        loaded[file] = true;
      });
    });

    loadAssets(pkgName, shims).then(function () {
      if (!N.wire) {
        throw new Error('Assets init error. Refresh page & try again. ' +
                        'If problem still exists - contact administrator.');
      }

      // First try to match full URL, if not matched - try without anchor.
      var baseUrl = location.protocol + '//' + location.host + location.pathname + location.search,
          route   = findRoute(baseUrl + location.hash, 'get') ||
                    findRoute(baseUrl, 'get');

      if (!route) {
        throw new Error('Init error: failed to detect internal identifier (route) of ' +
                        'this page. Refresh page & try again. If problem still exists ' +
                        '- contact administrator.');
      }

      // Execute after DOM is loaded:
      $(function () {
        var page_env = {
          url:     location.href,
          anchor:  location.hash,
          apiPath: route.meta.methods.get,
          params:  route.params,
          state:   window.history.state
        };

        var preload = [];

        Promise.resolve()
        .then(function () { return N.wire.emit('navigate.preload:' + route.meta.methods.get, preload); })
        .then(function () { return loadAssets(preload); })
        .then(function () { return N.wire.emit('navigate.done', page_env); })
        .then(function () { return N.wire.emit('navigate.done:' + route.meta.methods.get, page_env); })
        .then(function () { NodecaLoader.booted = true; })
        .then(null, function (err) {
          /*eslint-disable no-console*/
          try { console.error(err); } catch (__) {}
          alert('Init error: ' + err);
        });
      });
    })
    .then(null, function (err) {
      alert(err.message || err);
    });
  };

  // Really needed export.
  NodecaLoader.loadAssets = loadAssets;


  // Instantly executes the given `func` function passing `N` and `require`
  // as arguments.
  function execute(func) {
    func.call({}, N, require);
  }

  // Really needed export.
  NodecaLoader.execute = execute;

})(window);
