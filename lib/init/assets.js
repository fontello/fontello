"use strict";


/*global nodeca, _*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var Mincer      = require('mincer');
var UglifyJS    = require('uglify-js');
var Csso        = require('csso');
var nib         = require('nib');


// NLib
var HashTree    = require('nlib').Support.HashTree;


function get_compilable(filters, env) {
  var result = [];

  env.eachLogicalPath(filters, function (logicalPath) {
    result.push(logicalPath);
  });

  return result;
}


module.exports = function (next) {
  var files, ignore_list, env, manifest, assets_root;

  assets_root = path.resolve(__dirname, '../../public/assets');
  env         = new Mincer.Environment(nodeca.runtime.assets_path);
  files       = ['app.js', 'app.css', 'modernizr.js'];
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
  });


  // fill in paths
  env.appendPath(path.resolve(__dirname, '../../node_modules/faye/browser'));
  env.appendPath('assets/css');
  env.appendPath('assets/embedded_fonts');
  env.appendPath('assets/js');
  env.appendPath('assets/vendor');
  env.appendPath('system');


  env.jsCompressor = function (data, callback) {
    try {
      var ast = UglifyJS.parser.parse(data);

      ast = UglifyJS.uglify.ast_mangle(ast);
      // we do not squeezing, as it gives minimal reducs,
      // while takes way toooo much time

      callback(null, UglifyJS.uglify.gen_code(ast, {
        beautify:     ('development' === nodeca.runtime.env),
        indent_level: 2
      }));
    } catch (err) {
      callback(err);
    }
  };

  env.cssCompressor = function (data, callback) {
    try {
      callback(null, Csso.justDoIt(data));
    } catch (err) {
      callback(err);
    }
  };


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
