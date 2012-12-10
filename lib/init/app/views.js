// `views` section processor


'use strict';


/*global N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _       = require('underscore');
var async   = require('nlib').Vendor.Async;
var fstools = require('nlib').Vendor.FsTools;
var views   = require('nlib').Views;


// internal
var findPaths = require('./utils').findPaths;


////////////////////////////////////////////////////////////////////////////////


function processViews(outfile, config, filterPath, callback) {
  var viewsTree = {};

  async.forEachSeries(config.lookup, function (options, next) {
    findPaths(options, function (err, pathnames) {
      if (err) {
        next(err);
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
            function (nextPart) {
              views.engines[pathname.extname].server(str, {
                filename:   String(pathname),
                filterPath: filterPath
              }, function (err, result) {
                compiled.server = result;
                nextPart(err);
              });
            },
            function (nextPart) {
              views.engines[pathname.extname].client(str, {
                filename:   String(pathname),
                filterPath: filterPath
              }, function (err, result) {
                compiled.client = result;
                nextPart(err);
              });
            }
          ], nextPath);
        });
      }, next);
    });
  }, function (err) {
    if (err) {
      callback(err);
      return;
    }

    // Inject server tree
    _.extend(N.runtime.views, views.buildServerTree(viewsTree));

    // write client-side views tree
    views.writeClientTree(outfile, viewsTree, 'this.N.views', callback);
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, config, callback) {
  N.runtime.views = {};

  async.forEachSeries(_.keys(config.packages), function (pkgName, next) {
    var
    viewsConfig   = config.packages[pkgName].views,
    viewsOutfile  = path.join(tmpdir, pkgName, 'views.js');

    if (!viewsConfig) {
      next();
      return;
    }

    fstools.mkdir(path.dirname(viewsOutfile), function (err) {
      if (err) {
        next(err);
        return;
      }

      function filterPath(str) {
        var m = str.match(/^@([^\/]*)\/(.*)/), c, l, p;

        if (!m) {
          return str;
        }

        c = (config.packages[m[1] || pkgName] || {}).views || {};
        l = (c.lookup || []).slice();

        while (l.length) {
          p = path.join(l.shift().root, m[2]);

          if (fs.existsSync(p)) {
            return p;
          }

          p += '.jade';

          if (fs.existsSync(p)) {
            return p;
          }
        }

        return str;
      }

      processViews(viewsOutfile, viewsConfig, filterPath, next);
    });
  }, callback);
};
