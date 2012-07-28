"use strict";


/*global nodeca, _*/


// stdlib
var fs   = require('fs');
var path = require('path');


// 3rd-party
var Mincer = require('mincer');
var nib    = require('nib');


// NLib
var HashTree = require('nlib').Support.HashTree;


// internal
var compression = require('./assets/compression');


////////////////////////////////////////////////////////////////////////////////


function get_compilable(filters, env) {
  var result = [];

  env.eachLogicalPath(filters, function (logicalPath) {
    result.push(logicalPath);
  });

  return result;
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (next) {
  var files, ignore_list, env, manifest, assets_root;

  assets_root = path.resolve(nodeca.runtime.apps[0].root, 'public/assets');
  env         = new Mincer.Environment(nodeca.runtime.assets_path);
  files       = ['app.js', '*/app.js', 'app.css', '*/app.css', 'modernizr.js', 'es5-shim.js'];
  ignore_list = [/^faye-browser/];

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
      return asset ? ("/assets/" + asset.digestPath) : null;
    },
    version: function () {
      return nodeca.runtime.version;
    },
    env: function () {
      return nodeca.runtime.env;
    },
    config: function (part) {
      return !part ? nodeca.config : HashTree.get(nodeca.config, part);
    }
  });


  // Add some funky stuff to Stylus
  Mincer.StylusEngine.registerConfigurator(function (style) {
    style.use(nib());
    style.define('import-dir', require('../stylus/import-dir'));
  });


  // fill in paths
  env.appendPath(path.resolve(__dirname, '../../node_modules/faye/browser'));
  env.appendPath('assets/js');
  env.appendPath('assets/css');
  env.appendPath('assets/vendor');
  env.appendPath('assets/embedded_fonts');
  env.appendPath('system');


  // set up compressors
  env.jsCompressor  = compression.js;
  env.cssCompressor = compression.css;


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

    nodeca.runtime.assets = {environment: env, manifest: data};
    next();
  });
};
