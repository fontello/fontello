// `styles` section processor
//



'use strict';


// stdlib
var fs    = require('fs');
var path  = require('path');
var crypto = require('crypto');


// 3rd-party
var _       = require('lodash');
var async   = require('async');
var fstools = require('fs-tools');


// internal
var stopwatch = require('../utils/stopwatch');
var RENDERERS = require('./styles/renderers');
var findPaths = require('./utils/find_paths');


////////////////////////////////////////////////////////////////////////////////

// dummy helper to generate md5 hash of a `string`
//
function strDigest(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

// Compile styles for all blocks in package (from all files)
//
function joinStyles(lookup, destination, options) {
  var result = [];

  // calculated dile digest (md5)
  var fileDigest = _.memoize(function (file) {
    var content = '';
    try { content = fs.readFileSync(file, 'utf-8'); } catch(e) {}
    return strDigest(content);
  });

  findPaths(lookup, function (file) {
    var extname = path.extname(file)
      , renderer = RENDERERS[extname];
    
    if (!renderer) {
      throw new Error("Don't know how to compile " + file);
    }

    var cacheFilename = path.join(options.cacheDir, strDigest(file)) + '.json';

    // Cache structure:
    //
    // {
    //   resultCSS: 'compiled css',
    //   dependencies: {
    //     'dependency.styl': 'dependency digest',
    //     ...
    //   }
    // }
    //
    // NOTE: Dependencies include rendered file and all imported files
    //
    var cache = {
      resultCSS: null
    , dependencies: {}
    };

    // Load cache, if exists
    try { cache = JSON.parse(fs.readFileSync(cacheFilename, 'utf-8')); } catch(e) {}

    // Check if file or dependencies changed (calculate signatures)
    if ((null !== cache.resultCSS) &&
        _.any(cache.dependencies, function(digest, file) {
          return digest !== fileDigest(file);
        })
      )
    {
      cache.resultCSS = null;
    }

    // rebuild if no valid cache
    if (null === cache.resultCSS) {
      // Invoke renderer
      var data = renderer(file, options);

      cache.resultCSS = data.css;

      // Update dependencies
      cache.dependencies = _.transform(data.imports, function(dependencies, file){
        dependencies[file] = fileDigest(file);
      }, {});

      // Save cache
      fstools.mkdirSync(path.dirname(cacheFilename));
      fs.writeFileSync(cacheFilename, JSON.stringify(cache));
    }

    result.push(cache.resultCSS);
  });

  fstools.mkdirSync(path.dirname(destination));
  fs.writeFileSync(destination, result.join('\n'), 'utf8');
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (sandbox, callback) {
  var N      = sandbox.N
    , tmpdir = sandbox.tmpdir
    , cacheDir = path.join(N.config.options.cache_dir, 'modules_styles')
    , timer  = stopwatch();

  async.forEachSeries(_.keys(sandbox.config.packages), function (pkgName, next) {
    var stylesConfig  = sandbox.config.packages[pkgName].styles
      , stylesTmpDir  = path.join(tmpdir, 'styles', pkgName)
      , stylesTmpFile = path.join(stylesTmpDir, 'styles.css')
      , targetFile    = null
      , resultFile    = path.join(tmpdir, 'styles', pkgName + '.css')
      , environment   = sandbox.assets.environment
      , originPaths   = environment.paths // to restore it later
      , timer         = stopwatch();

    if (_.isEmpty(stylesConfig)) {
      next();
      return;
    }

    try {
      joinStyles(stylesConfig, stylesTmpFile, {
        pkgName:  pkgName
      , packages: sandbox.config.packages
      , cacheDir: cacheDir
      });
    } catch (err) {
      next(err);
      return;
    }

    // Use `main` file, if exists. Otherwise use concatenated styles file only.
    if (_.find(stylesConfig, 'main')) {
      targetFile = _.find(stylesConfig, 'main').main;
    } else {
      targetFile = stylesTmpFile;
    }

    // Prepend path with styles tree to allow use
    //
    //    //= require styles
    //
    // in main file.
    environment.prependPath(stylesTmpDir);

    // When Mincer is asked for a main file, it must be within roots, that
    // Mincer knows about. See: https://github.com/nodeca/mincer/issues/51
    stylesConfig.forEach(function (options) {
      environment.appendPath(options.root);
    });

    // Check that main file is requirable.
    if (!environment.findAsset(targetFile)) {
      // Restore Mincer's paths.
      environment.clearPaths();
      environment.appendPath(originPaths);

      next('Main style file of ' + pkgName + ' not found: ' + targetFile);
      return;
    }

    // Compile and write main file.
    environment.findAsset(targetFile).compile(function (err, data) {
      if (err) {
        next(err);
        return;
      }

      fs.writeFile(resultFile, data, 'utf8', function (err) {
        if (err) {
          next(err);
          return;
        }

        // restore mincer's paths
        environment.clearPaths();
        environment.appendPath(originPaths);

        N.logger.debug('Compiled styles of %s %s', pkgName, timer.elapsed);
        fstools.remove(stylesTmpDir, next);
      });
    });
  }, function (err) {
    N.logger.info('Processed styles section %s', timer.elapsed);
    callback(err);
  });
};
