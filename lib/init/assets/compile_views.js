'use strict';


/*global N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var views         = require('nlib').Views;
var async         = require('nlib').Vendor.Async;
var _             = require('nlib').Vendor.Underscore;
var safePropName  = require('nlib').Support.safePropName;


// internal
var findPaths = require('../../find_paths');


////////////////////////////////////////////////////////////////////////////////


// compileViews(root, callback(err)) -> Void
// - root (String): Pathname containing views directories.
// - callback (Function): Executed once everything is done.
//
// Compiles all views, inject them into `N.runtime.views` for the
// server and writes browserified versions into `views.js`.
//
module.exports = function compileViews(root, callback) {
  var
  bundleConfig  = require('../../../bundle.yml'),
  packageConfig = bundleConfig.packages.fontello,
  viewsConfig   = packageConfig.views,
  viewsRoot     = path.resolve(N.runtime.apps[0].root, viewsConfig.root),
  appRoot       = N.runtime.apps[0].root.replace(/\/*$/, '/'),
  findOptions   = _.pick(viewsConfig, 'include', 'exclude');

  findOptions.root = viewsRoot;

  // allow use includes relative to app root
  function filterPath(path) {
    return path.replace(/^@\/*/, appRoot);
  }

  findPaths(findOptions, function (err, pathnames) {
    var viewsTree = {};

    if (err) {
      callback(err);
      return;
    }

    async.forEachSeries(pathnames, function (pathname, nextPath) {
      pathname.read(function (err, str) {
        var compiled = viewsTree[pathname.api] = {};

        if (err) {
          nextPath(err);
          return;
        }

        async.parallel([
          function (next) {
            views.engines[pathname.extname].server(str, {
              filename:   String(pathname),
              filterPath: filterPath
            }, function (err, result) {
              compiled.server = result;
              next(err);
            });
          },
          function (next) {
            views.engines[pathname.extname].client(str, {
              filename:   String(pathname),
              filterPath: filterPath
            }, function (err, result) {
              compiled.client = result;
              next(err);
            });
          }
        ], nextPath);
      });
    }, function (err) {
      if (err) {
        callback(err);
        return;
      }

      // set server-side views tree
      N.runtime.views = views.buildServerTree(viewsTree);

      // write client-side views tree
      views.writeClientTree(
        path.join(root, 'views.js'),
        viewsTree,
        'this.N.views',
        callback
      );
    });
  });
};
