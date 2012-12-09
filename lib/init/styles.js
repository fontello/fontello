'use strict';


/*global N*/


// stdlib
var fs   = require('fs');
var path = require('path');


// 3rd-party
var async   = require('nlib').Vendor.Async;
var JASON   = require('nlib').Vendor.JASON;
var fstools = require('nlib').Vendor.FsTools;
var treeGet = require('nlib').Support.tree.get;
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
  environment = new Mincer.Environment(config.tmpdir),
  main_file   = 'styles.css';

  //
  // Mincer configuration (js/css compressors etc)
  //

  environment.appendPath('.');
  environment.appendPath(config.root);
  environment.appendPath(config.app_root);

  if (config.main) {
    main_file = config.main;
    environment.appendPath(path.dirname(config.main));
  }

  //
  // Provide some helpers to EJS and Stylus
  //

  environment.registerHelper({
    asset_path: function (pathname) {
      var asset = environment.findAsset(pathname);
      return !asset ? null : ("/assets/" + asset.digestPath);
    },
    N: function (path) {
      return treeGet(N, path);
    },
    jason: JASON.stringify
  });

  environment.findAsset(main_file).compile(function (err, data) {
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

    // provide app_root
    config.app_root = root;

    // compile
    async.series([
      async.apply(fstools.mkdir, config.tmpdir),
      async.apply(writeStyles, config),
      async.apply(compileResult, config)
    ], nextPackage);
  }, next);
};
