'use strict';


/*global N*/


// stdlib
var fs   = require('fs');
var path = require('path');


// 3rd-party
var async   = require('nlib').Vendor.Async;
var fstools = require('nlib').Vendor.FsTools;
var Mincer  = require('mincer');


// internal
var styles      = require('./processors/styles');
var eachPackage = require('../each_package');


////////////////////////////////////////////////////////////////////////////////


function writeStyles(config, callback) {
  styles.compile(config, function (err, css) {
    var filename = path.join(config.tmpdir, 'styles.css');

    if (err) {
      callback(err);
      return;
    }

    fs.writeFile(filename, css, 'utf8', callback);
  });
}


function compileResult(config, callback) {
  var
  env       = new Mincer.Environment(config.tmpdir),
  main_file = 'styles.css';

  // mincer configuration (js/css compressors etc)
  env.appendPath('.');
  env.appendPath(config.root);

  if (config.main) {
    main_file = config.main;
    env.appendPath(path.dirname(config.main));
  }

  env.findAsset(main_file).compile(function (err, data) {
    if (err) {
      callback(err);
      return;
    }

    fs.writeFile(config.output, data, 'utf8', callback);
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (dstdir, next) {
  var tmpdir;

  try {
    // create temporary dir for styles
    tmpdir = fstools.tmpdir();
    fs.mkdirSync(tmpdir);
  } catch (err) {
    next(err);
    return;
  }

  eachPackage(N.runtime.apps, function (name, root, config, nextPackage) {
    config = config.styles;

    if (!config) {
      nextPackage();
      return;
    }

    // resolve root
    config.root = path.join(root, config.root);

    // provide section tmpdir and output
    config.tmpdir = path.join(tmpdir, name, 'styles');
    config.output = path.join(dstdir, name + '.css');

    // compile
    async.series([
      async.apply(fstools.mkdir, config.tmpdir),
      async.apply(writeStyles, config),
      async.apply(compileResult, config)
    ], nextPackage);
  }, next);
};
