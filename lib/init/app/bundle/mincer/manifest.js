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
function compile(environment, config, outdir, callback) {
  var manifest    = new Mincer.Manifest(environment, outdir),
      filters     = [],
      blacklist   = [],
      files       = [];

  filters.push('loader.js', 'json2.js', 'es5-shim.js');
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
    filters.push(pkgName + '.css');

    N.config.locales.enabled.forEach(function (locale) {
      filters.push(pkgName + '.' + locale + '.js');
    });
  });

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

  manifest.compile(files, callback);
}


////////////////////////////////////////////////////////////////////////////////


module.exports.compile = compile;
