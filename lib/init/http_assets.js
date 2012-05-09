"use strict";


/*global nodeca, _*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var Mincer      = require('mincer');
var Environment = Mincer.Environment;
var Manifest    = Mincer.Manifest;
var UglifyJS    = require('uglify-js');
var Csso        = require('csso');
var connect     = require('connect');
var nib         = require('nib');


function needs_compilation(logicalPath, tests) {
  return _.any(tests, function (test) {
    if (_.isString(test)) {
      return test === logicalPath;
    }

    if (_.isRegExp(test)) {
      return test.test(logicalPath);
    }

    if (_.isFunction(test)) {
      return test(logicalPath);
    }

    return false;
  });
}


function get_compilable(files, env) {
  var result = [];

  env.eachLogicalPath(function (logicalPath) {
    if (needs_compilation(logicalPath, files)) {
      result.push(logicalPath);
    }
  });

  return result;
}


module.exports = function (next) {
  var files, env, manifest, assets_root;

  assets_root = path.resolve(__dirname, '../../public/assets');
  env         = new Environment(nodeca.runtime.assets_path);
  manifest    = new Manifest(env, assets_root);
  files       = ['app.js', 'app.css', 'modernizr.custom.js'];


  // function that mathces any non-js or non-css files
  files.push(function nonAsset(logicalPath) {
    var extname = path.extname(logicalPath);
    return (!/\.(js|css)$/.test(extname));
  });


  env.registerHelper('asset_path', function (pathname) {
    var asset = this.environment.findAsset(pathname);
    return asset ? ("/assets/" + asset.digestPath) : null;
  });

  env.registerHelper('version', function () {
    return nodeca.runtime.version;
  });

  env.registerHelper('env', function () {
    return nodeca.runtime.env;
  });

  env.registerHelper('config', function (part) {
    return part ? nodeca.config[part] : nodeca.config;
  });


  Mincer.StylusEngine.registerConfigurator(function (style) {
    style.use(nib());
  });


  // fill in paths
  env.appendPath('assets/css');
  env.appendPath('assets/embedded_fonts');
  env.appendPath('assets/img');
  env.appendPath('assets/js');
  env.appendPath('assets/vendor');
  env.appendPath('system');


  // init JS compressor for non-dev setups only
  if ('development' !== nodeca.runtime.env) {
    env.jsCompressor = function (data, callback) {
      try {
        var ast = UglifyJS.parser.parse(data);

        ast = UglifyJS.uglify.ast_mangle(ast);
        ast = UglifyJS.uglify.ast_squeeze(ast);

        callback(null, UglifyJS.uglify.gen_code(ast));
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
  }


  manifest.compile(get_compilable(files, env), function (err, data) {
    if (err) {
      next(err);
      return;
    }

    nodeca.runtime.assets_mincer    = env;
    nodeca.runtime.assets_manifest  = data;
    nodeca.runtime.assets_server    = connect.static(assets_root, {maxAge: Infinity});

    next();
  });
};
