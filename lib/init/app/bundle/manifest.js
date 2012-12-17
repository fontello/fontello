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
function compile(tmpdir, config, callback) {
  var
  environment = N.runtime.assets.environment,
  outdir      = path.join(N.runtime.apps[0].root, 'public/assets'),
  manifest    = new Mincer.Manifest(environment, outdir),
  filters     = [],
  blacklist   = [],
  files       = N.runtime.assets.bin.slice();

  filters.push('javascripts/app.js');
  filters.push('javascripts/loader.js');
  filters.push('vendor/json2.js', 'vendor/es5-shim.js');
  blacklist.push(/^faye-browser/);

  //
  // function that mathces any non-js or non-css files
  //

  filters.push(function nonAsset(logicalPath) {
    var extname = path.extname(logicalPath),
        ignore  = _.any(blacklist, function (re) {
          return re.test(logicalPath);
        });

    // - logicalPath should not be ignored
    // - extension must exist (e.g. logicalPath of `layout.ejs` is `layout`)
    // - extension must be anything but .js or .css
    return !(ignore || !extname || /\.(?:js|css)$/.test(extname));
  });

  //
  // Push all js/css of packages
  //

  _.keys(config.packages).forEach(function (pkgName) {
    filters.push('styles/' + pkgName + '.css');

    N.config.locales.enabled.forEach(function (locale) {
      filters.push('bundle/' + pkgName + '.' + locale + '.js');
    });
  });

  //
  // Prepend tmpdir iteslf
  //

  environment.prependPath('.');

  //
  // collect assets that must be compiled
  //

  try {
    environment.eachLogicalPath(filters, function (logicalPath) {
      files.push(logicalPath);
    });
  } catch (err) {
    callback(err);
    return;
  }

  //
  // run compiler
  //

  manifest.compile(files, function (err, data) {
    N.runtime.assets.manifest = data;
    callback(err);
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = compile;
