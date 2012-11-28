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
      var data;

      try {
        data = require(pathname.toString());
      } catch (err) {
        nextPath(err);
        return;
      }

      deepMerge(N.config.i18n, data.i18n);
      nextPath();
    }, next);
  });
};
