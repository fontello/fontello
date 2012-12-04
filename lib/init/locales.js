"use strict";


/*global N, _*/


// stdlib
var path = require('path');


// 3rd-party
var async = require('nlib').Vendor.Async;


// internal
var i18n = require('./processors/i18n');


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
  packageConfig = bundleConfig.packages.fontello;

  async.forEachSeries(['i18n_server', 'i18n_client'], function (section, nextSection) {
    var options, localesConfig = packageConfig[section];

    if (!localesConfig) {
      nextSection();
      return;
    }

    options       = _.pick(localesConfig, 'include', 'exclude');
    options.root  = path.resolve(N.runtime.apps[0].root, localesConfig.root);

    i18n.collect(options, function (err, data) {
      if (err) {
        nextSection(err);
        return;
      }

      deepMerge(N.config.i18n, data);
      nextSection();
    });
  }, next);
};
