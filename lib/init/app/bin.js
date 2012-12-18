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

  _.each(config.packages, function (pkgConfig) {
    if (pkgConfig.bin) {
      pkgConfig.bin.files.forEach(function (p) {
        N.runtime.assets.bin.push(String(p));
      });
    }
  });

  callback();
};
