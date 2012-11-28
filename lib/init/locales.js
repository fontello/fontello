"use strict";


/*global N, _*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var apiTree = require('nlib').ApiTree;
var async   = require('nlib').Vendor.Async;


// internal
var findPaths = require('../find_paths');


////////////////////////////////////////////////////////////////////////////////


function deepMerge(dst, src) {
  _.each(src, function (val, key) {
    if (!_.isObject(val)) {
      dst[key] = val;
      return;
    }

    deepMerge(dst[key] || (dst[key] = {}), val);
  });
}


function injectLocaleData(locale, api, data) {
  var dest;

  api   = api.join('.');
  dest  = N.config.i18n[locale] || (N.config.i18n[locale] = {});
  dest  = dest[api] || (dest[api] = {});

  deepMerge(dest, data);
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (next) {
  var
  bundleConfig  = require('../../bundle.yml'),
  packageConfig = bundleConfig.packages.fontello,
  localesConfig = packageConfig.i18n,
  localesRoot   = path.resolve(N.runtime.apps[0].root, localesConfig.root),
  findOptions   = _.pick(localesConfig, 'include', 'exclude');

  findOptions.root = localesRoot;

  findPaths(findOptions, function (err, pathnames) {
    if (err) {
      next(err);
      return;
    }

    async.forEachSeries(pathnames, function (pathname, nextPath) {
      var data, locale, api, ns;

      try {
        data = require(pathname.toString());
      } catch (err) {
        nextPath(err);
        return;
      }

      api     = pathname.apiPath.split('.');
      locale  = api.pop();

      if (api[api.length - 1] === api[api.length - 2]) {
        // as last element is locale name,
        // we have to normalize api manually here
        api.pop();
      }

      injectLocaleData(locale, api, data);
      nextPath();
    }, next);
  });
};
