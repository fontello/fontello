// `styles` section processor
// Make sure to run `bin` processor BEFORE styles if your main style files are
// using asset_path helpers.
//
//      .
//      |- /styles/
//      |   |- /<package>/
//      |   |   |- **/*.*
//      |   |   `- ...
//      |   `- ...
//      `- ...
//
//      ||
//      \/
//
//      .
//      |- /styles/
//      |   |- <package>.css
//      |   `- ...
//      `- ...
//



'use strict';


/*global N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _       = require('underscore');
var async   = require('nlib').Vendor.Async;
var JASON   = require('nlib').Vendor.JASON;
var fstools = require('nlib').Vendor.FsTools;
var treeGet = require('nlib').Support.tree.get;


// internal
var findPaths = require('./utils').findPaths;
var stopWatch = require('./utils').stopWatch;
var RENDERERS = require('./styles/renderers');


////////////////////////////////////////////////////////////////////////////////


// Write styles.css gathered from all lookup sources
function writeStyles(destination, config, callback) {
  fstools.mkdir(path.dirname(destination), function (err) {
    if (err) {
      callback(err);
      return;
    }

    findPaths(config.lookup, function (err, pathnames) {
      if (err) {
        callback(err);
        return;
      }

      async.mapSeries(pathnames, function (pathname, next) {
        var render = RENDERERS[pathname.extname];

        if (!render) {
          next("Don't know how to compile " + pathname);
          return;
        }

        render(pathname, next);
      }, function (err, chunks) {
        if (err) {
          callback(err);
          return;
        }

        fs.writeFile(destination, chunks.join('\n'), 'utf8', callback);
      });
    });
  });
}


function compileStyles(pkgName, tmpdir, config, callback) {
  var
  assetsOutdir    = path.join(tmpdir, 'assets'),
  stylesOutfile   = path.join(tmpdir, 'styles', pkgName + '.css'),
  stylesTreedir   = path.join(tmpdir, 'styles', pkgName),
  stylesTreefile  = path.join(stylesTreedir, 'styles.css'),
  mainFile        = stylesTreefile,
  timer           = stopWatch();

  writeStyles(stylesTreefile, config, function (err) {
    var
    environment = N.runtime.assets.environment,
    envPaths    = environment.paths;

    if (err) {
      callback(err);
      return;
    }

    environment.prependPath(stylesTreedir);

    if (config.main) {
      // FIXME: main file path resolvement seems strange
      mainFile = path.resolve(config.main.root, config.main.file);
      environment.appendPath(config.main.appRoot);
    }

    //
    // compile and write main file
    //

    environment.findAsset(mainFile).compile(function (err, data) {
      if (err) {
        callback(err);
        return;
      }

      fs.writeFile(stylesOutfile, data, 'utf8', function (err) {
        if (err) {
          callback(err);
          return;
        }

        environment.clearPaths();
        environment.appendPath(envPaths);

        N.logger.debug('Compiled styles of ' + pkgName + ' ' + timer.elapsed);
        fstools.remove(stylesTreedir, callback);
      });
    });
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, config, callback) {
  var timer = stopWatch();

  async.forEachSeries(_.keys(config.packages), function (pkgName, next) {
    var stylesConfig = config.packages[pkgName].styles;

    if (!stylesConfig) {
      next();
      return;
    }

    compileStyles(pkgName, tmpdir, stylesConfig, next);
  }, function (err) {
    N.logger.info('Processed styles section ' + timer.elapsed);
    callback(err);
  });
};
