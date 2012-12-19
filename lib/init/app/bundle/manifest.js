"use strict";


/*global N, _*/


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
  manifest    = new Mincer.Manifest(environment, outdir);

  //
  // Prepend tmpdir iteslf
  //

  environment.prependPath('.');

  //
  // run compiler
  //

  manifest.compile(sandbox.assets.files, function (err, data) {
    N.runtime.assets = {
      environment:  environment.index,
      manifest:     data
    };

    callback(err);
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = compile;
