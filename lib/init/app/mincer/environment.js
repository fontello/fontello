"use strict";


// stdlib
var path = require('path');


// 3rd-party
var Mincer = require('mincer');


// internal
var compression = require('./compression');


////////////////////////////////////////////////////////////////////////////////


function configure(tmpdir /*, config, apps*/) {
  var environment = new Mincer.Environment(tmpdir);

  //
  // Provide some helpers to EJS and Stylus
  //

  environment.ContextClass.defineAssetPath(function (pathname, options) {
    var asset = environment.findAsset(pathname, options);
    return !asset ? null : ("/assets/" + asset.digestPath);
  });

  //
  // fill in 3rd-party modules paths
  //

  environment.appendPath(path.resolve(__dirname, '../../../../node_modules/pointer/browser'));
  environment.appendPath(path.resolve(__dirname, '../../../../node_modules/babelfish/browser'));

  //
  // Set JS/CSS compression if it was not explicitly disabled
  // USAGE: SKIP_ASSETS_COMPRESSION=1 ./N.js server
  //

  if (!process.env.SKIP_ASSETS_COMPRESSION) {
    environment.jsCompressor  = compression.js;
    environment.cssCompressor = compression.css;
  }

  return environment;
}


////////////////////////////////////////////////////////////////////////////////


module.exports.configure = configure;
