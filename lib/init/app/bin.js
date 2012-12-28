// `bin` section processor


'use strict';


/*global underscore, N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _       = underscore;
var async   = require('async');
var fstools = require('fs-tools');


// internal
var findPaths = require('./utils/find_paths');
var stopwatch = require('./utils/stopwatch');


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
