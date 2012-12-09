// `styles` section processor
// Make sure to run `bin` processor BEFORE styles if your main style files are
// using asset_path helpers.


'use strict';


/*global N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _       = require('underscore');
var async   = require('nlib').Vendor.Async;
var JASON   = require('nlib').Vendor.JASON;
var fstools = require('nlib').Vendor.FsTools;
var treeGet = require('nlib').Support.tree.get;
var Mincer  = require('mincer');
var nib     = require('nib');


// internal
var findPaths = require('./utils').findPaths;
var RENDERERS = require('./styles/renderers');


////////////////////////////////////////////////////////////////////////////////


Mincer.StylusEngine.registerConfigurator(function (style) {
  style.use(nib());
});


////////////////////////////////////////////////////////////////////////////////


// Combines all styles from a lookup path
function renderStyles(options, callback) {
  findPaths(options, function (err, pathnames) {
    if (err) {
      callback(err);
      return;
    }

    async.mapSeries(pathnames, function (pathname, next) {
      var render = RENDERERS[pathname.extname];

      if (!render) {
        next("Don't know how to compile " + pathname);
        return;
      }

      render(pathname, next);
    }, function (err, chunks) {
      callback(err, chunks.join('\n'));
    });
  });
}


// Write styles.css gathered from all lookup sources
function writeRenderedStyles(destination, config, callback) {
  fstools.mkdir(path.dirname(destination), function (err) {
    if (err) {
      callback(err);
      return;
    }

    async.mapSeries(config.lookup, function (options, next) {
      renderStyles(_.extend({ main: config.main }, options), next);
    }, function (err, chunks) {
      if (err) {
        callback(err);
        return;
      }

      fs.writeFile(destination, chunks.join('\n'), 'utf8', callback);
    });
  });
}


function compileStyles(pkgName, tmpdir, config, callback) {
  var
  assets_outdir = path.join(tmpdir, 'bin', pkgName),
  styles_outdir = path.join(tmpdir, 'styles', pkgName),
  styles_file   = path.join(styles_outdir, 'styles.css'),
  main_file     = styles_file;

  writeRenderedStyles(styles_file, config, function (err) {
    var environment = new Mincer.Environment(tmpdir);

    if (err) {
      callback(err);
      return;
    }

    environment.appendPath('.');
    environment.appendPath(styles_outdir);
    environment.appendPath(assets_outdir);

    if (config.main) {
      main_file = path.resolve(config.main.root, config.main.file);
      environment.appendPath(config.main.appRoot);
    }

    //
    // Provide some helpers to EJS and Stylus
    //

    environment.registerHelper({
      asset_path: function (pathname) {
        var asset = environment.findAsset(pathname);
        return !asset ? "file-not-found" : ("/assets/" + asset.digestPath);
      },
      N: function (path) {
        return treeGet(N, path);
      },
      jason: JASON.stringify
    });

    //
    // compile and write main file
    //

    environment.findAsset(main_file).compile(function (err, data) {
      var outfile = path.join(tmpdir, 'styles', pkgName + '.css');

      if (err) {
        callback(err);
        return;
      }

      fs.writeFile(outfile, data, 'utf8', callback);
    });
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, config, callback) {
  async.forEachSeries(_.keys(config.packages), function (pkgName, next) {
    var styles_config = config.packages[pkgName].styles;

    if (!styles_config) {
      next();
      return;
    }

    compileStyles(pkgName, tmpdir, styles_config, next);
  }, callback);
};
