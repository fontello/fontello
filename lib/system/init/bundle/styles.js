// `styles` section processor
//



'use strict';


// stdlib
var fs      = require('fs');
var path    = require('path');
var assert  = require('assert');


// 3rd-party
var _       = require('lodash');
var fstools = require('fs-tools');


// internal
var stopwatch = require('../utils/stopwatch');
var RENDERERS = require('./styles/renderers');
var findPaths = require('./utils/find_paths');
var Processor = require('./utils/cached_processor');


////////////////////////////////////////////////////////////////////////////////

// Compile styles for all blocks in package (from all files)
//
function joinStyles(lookup, destination, options) {
  var result = [];

  var processor = new Processor({
    cache: path.join(options.cacheDir, options.pkgName + '.json')
  });

  processor.process = function (file) {
    var extname = path.extname(file)
      , renderer = RENDERERS[extname];

    assert.ok(renderer, 'Don\'t know how to compile ' + file);

    var data = renderer(file, options);
    processor.addDependencies(file, data.imports);

    return data.css;
  };

  findPaths(lookup, function (file) {
    result.push(processor.get(file));
  });

  fstools.mkdirSync(path.dirname(destination));
  fs.writeFileSync(destination, result.join('\n'), 'utf8');
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (sandbox) {
  var N      = sandbox.N
    , tmpdir = sandbox.tmpdir
    , cacheDir = path.join(N.config.options.cache_dir, 'modules_styles')
    , timer  = stopwatch();

  _.keys(sandbox.config.packages).forEach(function (pkgName) {
    var stylesConfig  = sandbox.config.packages[pkgName].styles
      , stylesTmpDir  = path.join(tmpdir, 'styles', pkgName)
      , stylesTmpFile = path.join(stylesTmpDir, 'styles.css')
      , targetFile    = null
      , resultFile    = path.join(tmpdir, 'styles', pkgName + '.css')
      , environment   = sandbox.assets.environment
      , originPaths   = environment.paths // to restore it later
      , timer         = stopwatch();

    if (_.isEmpty(stylesConfig)) {
      return;
    }

    joinStyles(stylesConfig, stylesTmpFile, {
      pkgName:  pkgName
    , packages: sandbox.config.packages
    , cacheDir: cacheDir
    });

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

    // Find & build asset
    var asset = environment.findAsset(targetFile);

    // Check that main file is requirable.
    if (!asset) {
      // Restore Mincer's paths.
      environment.clearPaths();
      environment.appendPath(originPaths);
      throw new Error('Main style file of ' + pkgName + ' not found: ' + targetFile);
    }

    // Write main file.
    fs.writeFileSync(resultFile, asset.buffer, 'utf8');

    // restore mincer's paths
    environment.clearPaths();
    environment.appendPath(originPaths);

    N.logger.debug('Compiled styles of %s %s', pkgName, timer.elapsed);
    fstools.removeSync(stylesTmpDir);
  });

  N.logger.info('Processed styles section %s', timer.elapsed);
};
