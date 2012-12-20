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
var stopwatch = require('./utils').stopwatch;


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, sandbox, callback) {
  var timer = stopwatch();

  // When Mincer is asked for a file, this file must be within roots, that
  // Mincer knows about. See: https://github.com/nodeca/mincer/issues/51
  _.each(sandbox.config.packages, function (pkgConfig) {
    if (pkgConfig.bin) {
      pkgConfig.bin.lookup.forEach(function (options) {
        sandbox.assets.environment.appendPath(options.root);
      });

      pkgConfig.bin.files.forEach(function (p) {
        sandbox.assets.files.push(String(p));
      });
    }
  });

  callback();
};
