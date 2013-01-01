// `styles` section processor
//



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
var stopwatch = require('./utils/stopwatch');
var RENDERERS = require('./styles/renderers');


////////////////////////////////////////////////////////////////////////////////


// Compile styles for all blocks in package (from all pathnames)
//
function concatStyles(pathnames, destination, callback) {
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


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, sandbox, callback) {
  var timer = stopwatch();

  // When Mincer is asked for a main file, it must be within roots, that
  // Mincer knows about. See: https://github.com/nodeca/mincer/issues/51
  _.each(sandbox.config.packages, function (pkgConfig) {
    if (pkgConfig.styles) {
      pkgConfig.styles.lookup.forEach(function (options) {
        sandbox.assets.environment.appendPath(options.root);
      });
    }
  });

  async.forEachSeries(_.keys(sandbox.config.packages), function (pkgName, next) {
    var
    stylesConfig      = sandbox.config.packages[pkgName].styles,
    // final file (contains styles tree and main file)
    stylesOutfile     = path.join(tmpdir, 'styles', pkgName + '.css'),
    // isolated directory with styles tree
    stylesTmpTreedir  = path.join(tmpdir, 'styles', pkgName),
    // styles tree
    stylesTmpTreefile = path.join(stylesTmpTreedir, 'styles.css'),
    // per-package timer
    timer             = stopwatch();

    if (!stylesConfig) {
      next();
      return;
    }

    concatStyles(stylesConfig.files, stylesTmpTreefile, function (err) {
      var
      // if config has "main file", the respect it, otherwise use styles tree only
      mainFile    = String(stylesConfig.main || stylesTmpTreefile),
      // get existing mincer environment
      environment = sandbox.assets.environment,
      // get current paths list, to restore it later
      envPaths    = environment.paths;

      if (err) {
        next(err);
        return;
      }

      // we need to prepend path with styles tree to allow use
      //
      //    //= require styles
      //
      // in main file
      environment.prependPath(stylesTmpTreedir);

      //
      // compile and write main file
      //

      environment.findAsset(mainFile).compile(function (err, data) {
        if (err) {
          next(err);
          return;
        }

        fs.writeFile(stylesOutfile, data, 'utf8', function (err) {
          if (err) {
            next(err);
            return;
          }

          // restore mincer's paths
          environment.clearPaths();
          environment.appendPath(envPaths);

          // push pckage file into the bundle list
          sandbox.assets.files.push(stylesOutfile);

          N.logger.debug('Compiled styles of ' + pkgName + ' ' + timer.elapsed);
          fstools.remove(stylesTmpTreedir, next);
        });
      });
    });
  }, function (err) {
    N.logger.info('Processed styles section ' + timer.elapsed);
    callback(err);
  });
};
