"use strict";


/*global nodeca, _*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var Environment = require('mincer').Environment;
var Manifest    = require('mincer').Manifest;
var connect     = require('connect');


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
  var files, env, manifest, public_root;

  public_root = path.resolve(__dirname, '../../tmp/assets');
  env         = new Environment(nodeca.runtime.assets_path);
  manifest    = new Manifest(env, public_root);
  files       = ['app.js', 'app.css', 'modernizr.custom.js'];


  env.ContextClass.prototype.assetPath = function (pathname) {
    var asset = this.environment.findAsset(pathname);
    return asset ? ("/static/" + asset.digestPath) : null;
  };

  env.ContextClass.prototype.helpers.asset_path = 'assetPath';

  // function that mathces any non-js or non-css files
  files.push(function nonAsset(logicalPath) {
    var extname = path.extname(logicalPath);
    return (-1 === ['.js', '.css'].indexOf(extname));
  });

  // fill in paths
  env.appendPath('assets/css');
  env.appendPath('assets/embedded_fonts');
  env.appendPath('assets/img');
  env.appendPath('assets/js');
  env.appendPath('assets/vendor');
  env.appendPath('system');

  manifest.compile(get_compilable(files, env), function (err, data) {
    if (err) {
      next(err);
      return;
    }

    nodeca.runtime.assets_mincer    = env;
    nodeca.runtime.assets_manifest  = data;
    nodeca.runtime.assets_server    = connect.static(public_root);
    next();
  });
};
