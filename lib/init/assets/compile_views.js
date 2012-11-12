'use strict';


/*global nodeca*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var views     = require('nlib').Views;
var async     = require('nlib').Vendor.Async;
var _         = require('nlib').Vendor.Underscore;


// internal
var findPaths = require('./find_paths');


////////////////////////////////////////////////////////////////////////////////


// compileViews(root, callback(err)) -> Void
// - root (String): Pathname containing views directories.
// - callback (Function): Executed once everything is done.
//
// Compiles all views, inject them into `nodeca.runtime.views` for the
// server and writes browserified versions into `views.js`.
//
module.exports = function compileViews(root, callback) {
  var bundleConfig = require('../../../bundle.yml');

  async.forEachSeries(Object.keys(bundleConfig.packages), function (id, nextPkg) {
    var
    packageConfig = bundleConfig.packages[id],
    viewsConfig   = packageConfig.views;

    if (!viewsConfig) {
      nextPkg();
      return;
    }

    var
    viewsRoot     = path.resolve(nodeca.runtime.apps[0].root, viewsConfig.root),
    findOptions   = _.pick(viewsConfig, 'include', 'exclude');

    findOptions.root      = viewsRoot;
    findOptions.apiPrefix = id;

    findPaths(findOptions, function (err, pathnames) {
      var viewsTree = {};

      if (err) {
        nextPkg(err);
        return;
      }

      async.forEach(pathnames, function (pathname, nextPath) {
        pathname.read('utf8', function (err, str) {
          var compiled = viewsTree[pathname.apiPath] = {};

          async.parallel([
            function (next) {
              views.engines[pathname.extension].server(str, {
                filename: pathname.absolutePath
              }, function (err, result) {
                compiled.server = result;
                next(err);
              });
            },
            function (next) {
              views.engines[pathname.extension].client(str, {
                filename: pathname.absolutePath
              }, function (err, result) {
                compiled.client = result;
                next(err);
              });
            }
          ], nextPath);
        });
      }, function (err) {
        if (err) {
          nextPkg(err);
          return;
        }

        // set server-side views tree
        nodeca.runtime.views[id] = views.buildServerTree(viewsTree);

        // write client-side views tree
        views.writeClientTree(
          path.join(root, id + '-views.js'),
          viewsTree,
          'this.nodeca.views',
          nextPkg
        );
      });
    });
  }, callback);
};
