"use strict";


/*global N*/


// stdlib
var path = require('path');


// 3rd-party
var Mincer = require('mincer');


////////////////////////////////////////////////////////////////////////////////


// compile(output, environment, callback(err, manifest)) -> Void
// - output (String): Root of the manifest file.
//
// Compiles and outputs files and manifest data for the `environment` into the
// given manifest `root`.
//
function compile(tmpdir, sandbox, callback) {
  var
  environment = sandbox.assets.environment,
  outdir      = path.join(N.runtime.apps[0].root, 'public/assets'),
  manifest    = null,
  fileslist   = null;

  //
  // Prepend tmpdir iteslf
  //

  environment.prependPath('.');

  //
  // normalize filenames (loader.js.ejs -> loader.js)
  // needed for proper caching by environment.index
  //

  fileslist = sandbox.assets.files.map(function (f) {
    return environment.findAsset(f).logicalPath;
  }).filter(Boolean);

  //
  // make environment hardly cached. Init manifest.
  //

  environment = environment.index;
  manifest    = new Mincer.Manifest(environment, outdir);

  //
  // run compiler
  //

  manifest.compile(fileslist, function (err, data) {
    N.runtime.assets = {
      environment:  environment,
      manifest:     data
    };

    callback(err);
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = compile;
