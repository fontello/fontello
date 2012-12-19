// `styles` section processor
//
// Make sure to run `bin` processor BEFORE styles if your main style files are
// using asset_path helpers.
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
function writeStyles(pathnames, destination, callback) {
  fstools.mkdir(path.dirname(destination), function (err) {
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
}


function compileStyles(pkgName, tmpdir, config, callback) {
  var
  // final file (contains styles tree and main file)
  stylesOutfile   = path.join(tmpdir, 'styles', pkgName + '.css'),
  // isolated directory with styles tree
  stylesTreedir   = path.join(tmpdir, 'styles', pkgName),
  // styles tree
  stylesTreefile  = path.join(stylesTreedir, 'styles.css'),
  timer           = stopWatch();

  writeStyles(config.files, stylesTreefile, function (err) {
    var
    // if config has "main file", the respect it, otherwise use styles tree only
    mainFile    = String(config.main || stylesTreefile),
    // get existing mincer environment
    environment = N.runtime.assets.environment,
    // get current paths list, to restore it later
    envPaths    = environment.paths;

    if (err) {
      callback(err);
      return;
    }

    // we need to prepend path with styles tree to allow use
    //
    //    //= require styles
    //
    // in main file
    environment.prependPath(stylesTreedir);

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

        // restore mincer's paths
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

  // When Mincer is asked for a file, this file must be within roots, that
  // Mincer knows about. See: https://github.com/nodeca/mincer/issues/51
  _.each(config.packages, function (pkgConfig) {
    if (pkgConfig.styles) {
      pkgConfig.styles.lookup.forEach(function (options) {
        N.runtime.assets.environment.appendPath(options.root);
      });
    }
  });

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
