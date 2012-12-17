// `bin` section processor
//
//  .
//  |- /assets/
//  |   |- /<package>/
//  |   |   |- **/*.*
//  |   |   `- ...
//  |   `- ...
//  `- ...
//


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


function processAssets(config, callback) {
  findPaths(config.lookup, function (err, pathnames) {
    if (err) {
      callback(err);
      return;
    }

    _.each(pathnames, function (p) {
      N.runtime.assets.bin[p.relative] = String(p);
    });

    callback();
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, config, callback) {
  var timer = stopWatch();

  async.forEachSeries(_.keys(config.packages), function (pkgName, next) {
    var assetsConfig = config.packages[pkgName].bin;

    if (!assetsConfig) {
      next();
      return;
    }

    processAssets(assetsConfig, next);
  }, function (err) {
    N.logger.info('Processed assets (bin) section ' + timer.elapsed);
    callback(err);
  });
};
