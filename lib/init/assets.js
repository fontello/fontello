"use strict";


/*global nodeca, _*/


// stdlib
var fs   = require('fs');
var path = require('path');


// 3rd-party
var Mincer = require('mincer');
var nib    = require('nib');
var JASON  = require('nlib').Vendor.JASON;


// NLib
var HashTree = require('nlib').Support.HashTree;


// internal
var compression = require('./assets/compression');


////////////////////////////////////////////////////////////////////////////////


// set custom logger for the Mincer
Mincer.logger.use(nodeca.logger.getLogger('system'));


// helper to get list of files matching given `filters`
function get_compilable(filters, env) {
  var result = [];

  env.eachLogicalPath(filters, function (logicalPath) {
    result.push(logicalPath);
  });

  return result;
}


////////////////////////////////////////////////////////////////////////////////


// Mincer initailization middleware
//
// Sets `nodeca.runtime.assets.environment` property with link to initialized
// Mincer.Environment and `nodca.runtime.assets.manifest` with manifest data.
//
module.exports = function (next) {
  var files, ignore_list, env, manifest, assets_root;

  assets_root = path.resolve(nodeca.runtime.apps[0].root, 'public/assets');
  env         = new Mincer.Environment(nodeca.runtime.assets_path);
  files       = ['lib.js', 'app.js', 'app.css', 'loader.js'];
  ignore_list = [/^faye-browser/, /\.jade$/];


  files.push('*/app.js', '*/app.css');
  files.push('**/api.js', '**/i18n/*.js', 'views/**.js');

  // function that mathces any non-js or non-css files
  files.push(function nonAsset(logicalPath) {
    var extname = path.extname(logicalPath),
        ignore  = _.any(ignore_list, function (re) {
          return re.test(logicalPath);
        });

    return !(ignore || /\.(js|css)$/.test(extname));
  });


  // Provide some helpers to EJS and Stylus
  env.registerHelper({
    asset_path: function (pathname) {
      var asset = this.environment.findAsset(pathname);
      return !asset ? null : ("/assets/" + asset.digestPath);
    },
    asset_include: function (pathname) {
      var asset = this.environment.findAsset(pathname);
      return !asset ? "" : asset.toString();
    },
    nodeca: function (path) {
      return !path ? nodeca : HashTree.get(nodeca, path);
    },
    jason: JASON.stringify
  });

  // Add some funky stuff to Stylus
  Mincer.StylusEngine.registerConfigurator(function (style) {
    style.use(nib());
    style.define('import-dir', require('../stylus/import-dir'));
  });


  // fill in paths
  env.appendPath(path.resolve(__dirname, '../../node_modules/faye/browser'));
  env.appendPath(path.resolve(__dirname, '../../../nlib/node_modules/pointer/browser'));
  env.appendPath(path.resolve(__dirname, '../../../nlib/node_modules/babelfish/browser'));
  env.appendPath('assets/js');
  env.appendPath('assets/css');
  env.appendPath('assets/vendor');
  env.appendPath('assets/embedded_fonts');
  env.appendPath('system');
  env.appendPath('views');


  // USAGE: SKIP_ASSETS_COMPRESSION=1 ./nodeca.js server
  if (!process.env.SKIP_ASSETS_COMPRESSION) {
    // set up compressors
    env.jsCompressor  = compression.js;
    env.cssCompressor = compression.css;
  }


  // once environment is configured,
  // it can be replaced with 'static' cache version
  env         = env.index;
  manifest    = new Mincer.Manifest(env, assets_root);


  // compile manifest
  manifest.compile(get_compilable(files, env), function (err, data) {
    if (err) {
      next(err);
      return;
    }

    nodeca.runtime.assets = { environment: env, manifest: data };
    next();
  });
};
