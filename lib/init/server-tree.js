'use strict';


/*global N*/


// Initializes server tree


// stdlib
var fs = require('fs');
var path = require('path');


// 3rd-party
var async = require('nlib').Vendor.Async;
var _     = require('underscore');


// internal
var growTree = require('./processors/server-tree').growTree;


function eachBundle(apps, iterator, callback) {
  async.forEachSeries(apps, function (app, next) {
    var bundle = path.join(app.root, 'bundle.yml');

    fs.exists(bundle, function (exists) {
      var data;

      if (!exists) {
        next();
        return;
      }

      iterator(app.root, require(bundle), next);
    });
  }, callback);
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (next) {
  eachBundle(N.runtime.apps, function (root, bundleConfig, nextBundle) {
    var packages = bundleConfig.packages || {};

    async.forEachSeries(_.keys(packages), function (name, nextPackage) {
      var config = packages[name].server;

      if (!config) {
        nextPackage();
        return;
      }

      // resolve root
      config.root = path.join(root, config.root);

      // try auto-guess apiPrefix
      if (-1 === Object.getOwnPropertyNames(config).indexOf('apiPrefix')) {
        config.apiPrefix = name;
      }

      // collect files and "grow" server tree
      growTree(N.server, config, nextPackage);
    }, nextBundle);
  }, next);
};
