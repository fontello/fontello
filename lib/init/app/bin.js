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

  // When Mincer is asked for a file, this file must be within roots, that
  // Mincer knows about. See: https://github.com/nodeca/mincer/issues/51
  _.each(config.packages, function (pkgConfig) {
    if (pkgConfig.bin) {
      pkgConfig.bin.lookup.forEach(function (options) {
        N.runtime.assets.environment.appendPath(options.root);
      });
    }
  });

  callback();
};
