'use strict';


// stdlib
var fs = require('fs');
var path = require('path');


// 3rd-party
var async = require('nlib').Vendor.Async;
var _     = require('underscore');


////////////////////////////////////////////////////////////////////////////////


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


function eachPackage(apps, iterator, callback) {
  eachBundle(apps, function (root, bundleConfig, nextBundle) {
    var packages = bundleConfig.packages || {};

    async.forEachSeries(_.keys(packages), function (name, nextPackage) {
      iterator(name, root, packages[name], nextPackage);
    }, nextBundle);
  }, callback);
}


////////////////////////////////////////////////////////////////////////////////


module.exports = eachPackage;
