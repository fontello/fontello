// Compiles and outputs files and provides manifest (will be used later to speed
// up JS/CSS compilation with cache) and preconfigured server.
//


"use strict";


// stdlib
var path = require('path');
var format = require('util').format;


// 3rd-party
var _       = require('lodash');
var Mincer  = require('mincer');
var fstools = require('fs-tools');


var stopwatch = require('../utils/stopwatch');


////////////////////////////////////////////////////////////////////////////////


// compile(output, environment, callback(err, manifest)) -> Void
// - output (String): Root of the manifest file.
//
// Compiles and outputs files and manifest data for the `environment` into the
// given manifest `root`.
//
module.exports = function (sandbox, callback) {
  var N           = sandbox.N
    , timer       = stopwatch()
    , environment = sandbox.assets.environment
    , outdir      = path.join(N.runtime.mainApp.root, 'public/assets')
    , manifest    = null
    , fileslist   = null;

  //
  // Check assets integtity - ones, used via helpers must exists
  // in `bin` section of `bundle.yml`. If not exists, we'll get
  // 404 errors on client
  //
  var missed =  _.find(sandbox.assets.used, function(assetPath) {
    return -1 === sandbox.assets.files.indexOf(assetPath) ? true : false;
  });

  if (missed) {
    // Purge cache, to force full recompile on next restart.
    // In other case, helpers call can be missed and we will not check
    // if paths are correct
    fstools.removeSync(N.config.options.cache_dir);

    callback(format(
      "Error in 'bundle.yml': section 'bin' miss search path for '%s'",
      missed
    ));
    return;
  }


  //
  // Normalize filenames (loader.js.ejs -> loader.js)
  // needed for proper caching by environment.index
  //

  fileslist = _(sandbox.assets.files)
    .map(function (f) {
      return (environment.findAsset(f) || {}).logicalPath;
    })
    .filter(Boolean).uniq()
    .valueOf();

  //
  // make environment hardly cached. Init manifest.
  //

  environment = environment.index;
  manifest    = new Mincer.Manifest(environment, outdir);

  //
  // run compiler
  //

  manifest.compile(fileslist, function (err, data) {
    var logger = N.logger.getLogger('bin@core.assets');
    var server = new Mincer.Server(environment, data);

    //
    // Formats and writes log event into our logger
    //

    server.log = function logAssets(level, event) {
      logger[level]('%s - "%s %s HTTP/%s" %d "%s" - %s',
                    event.remoteAddress,
                    event.method,
                    event.request.originalUrl || event.url,
                    event.httpVersion,
                    event.code,
                    event.headers['user-agent'] || '',
                    event.message);
    };

    N.runtime.assets = {
      distribution: sandbox.assets.distribution,
      environment:  environment,
      manifest:     data,
      server:       server
    };

    N.logger.info('Processed text macroces and binary files %s', timer.elapsed);

    callback(err);
  });
};
