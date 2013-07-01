// Compiles and outputs files and provides manifest (will be used later to speed
// up JS/CSS compilation with cache) and preconfigured server.
//


"use strict";


// stdlib
var path = require('path');


// 3rd-party
var _       = require('lodash');
var Mincer  = require('mincer');


////////////////////////////////////////////////////////////////////////////////


// compile(output, environment, callback(err, manifest)) -> Void
// - output (String): Root of the manifest file.
//
// Compiles and outputs files and manifest data for the `environment` into the
// given manifest `root`.
//
module.exports = function (sandbox, callback) {
  var N = sandbox.N
    , environment = sandbox.assets.environment
    , outdir      = path.join(N.runtime.mainApp.root, 'public/assets')
    , manifest    = null
    , fileslist   = null;

  //
  // normalize filenames (loader.js.ejs -> loader.js)
  // needed for proper caching by environment.index
  //

  fileslist = _(sandbox.assets.files)
    .map(function (f) {
      return (environment.findAsset(f) || {}).logicalPath;
    })
    .filter(Boolean).uniq()
    .valueOf();

  //
  // Set JS/CSS compression if it was not explicitly disabled
  // USAGE: SKIP_ASSETS_COMPRESSION=1 ./nodeca.js server
  //
  //if (!process.env.SKIP_ASSETS_COMPRESSION) {
  // Don't use compressors on development, to speedup reload
  if ('development' !== N.runtime.env) {
    environment.jsCompressor  = "uglify";
    environment.cssCompressor = "csso";
  }

  //
  // make environment hardly cached. Init manifest.
  //

  environment = environment.index;
  manifest    = new Mincer.Manifest(environment, outdir);

  //
  // run compiler
  //

  manifest.compile(fileslist, function (err, data) {
    var
    logger = N.logger.getLogger('bin@core.assets'),
    server = new Mincer.Server(environment, data);

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

    callback(err);
  });
};
