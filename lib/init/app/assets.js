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


////////////////////////////////////////////////////////////////////////////////


function processAssets(outdir, config, callback) {
  async.forEachSeries(config.lookup, function (options, next) {
    findPaths(options, function (err, pathnames) {
      if (err) {
        next(err);
        return;
      }

      async.forEachSeries(pathnames, function (pathname, nextPathname) {
        var
        basepath    = new RegExp('^' + options.root + '/*'),
        relative    = String(pathname).replace(basepath, ''),
        destination = path.join(outdir, relative);

        fstools.copy(pathname.toString(), destination, nextPathname);
      }, next);
    });
  }, callback);
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, config, callback) {
  async.forEachSeries(_.keys(config.packages), function (pkgName, next) {
    var
    assetsConfig = config.packages[pkgName].bin,
    assetsOutdir = path.join(tmpdir, 'assets', pkgName);

    if (!assetsConfig) {
      next();
      return;
    }

    processAssets(assetsOutdir, assetsConfig, next);
  }, callback);
};
