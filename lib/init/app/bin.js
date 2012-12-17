// `bin` section processor


'use strict';


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var async   = require('nlib').Vendor.Async;
var fstools = require('nlib').Vendor.FsTools;
var _       = require('underscore');


// internal
var findPaths = require('./utils').findPaths;
var stopWatch = require('./utils').stopWatch;


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, config, callback) {
  var timer = stopWatch();

  async.forEachSeries(_.keys(config.packages), function (pkgName, next) {
    var assetsConfig = config.packages[pkgName].bin;

    if (!assetsConfig) {
      next();
      return;
    }

    findPaths(assetsConfig.lookup, function (err, pathnames) {
      if (err) {
        next(err);
        return;
      }

      _.each(pathnames, function (p) {
        N.runtime.assets.bin.push(String(p));
      });

      next();
    });
  }, function (err) {
    N.logger.info('Processed assets (bin) section ' + timer.elapsed);
    callback(err);
  });
};
