// `views` section processor
//


'use strict';


/*global N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _       = require('lodash');
var async   = require('async');
var fstools = require('fs-tools');


// internal
var findPaths = require('./utils').findPaths;
var stopwatch = require('./utils').stopwatch;
var views     = require('../../views');


////////////////////////////////////////////////////////////////////////////////


function processViews(outfile, config, callback) {
  var viewsTree = {};

  async.forEachSeries(config.files, function (pathname, next) {
    var str;

    try {
      str = pathname.readSync();
    } catch (err) {
      next(err);
      return;
    }

    async.parallel([
      function (next) {
        // compile server-side views (functions)
        views.engines[pathname.extname].server(str, {
          filename: String(pathname)
        }, next);
      },
      function (next) {
        // compile client-side views (string sources of functions)
        views.engines[pathname.extname].client(str, {
          filename: String(pathname)
        }, next);
      }
    ], function (err, results) {
      // expose compiled data into the tree
      results = results || [];

      viewsTree[pathname.apiPath] = {
        server: results[0],
        client: results[1]
      };

      next(err);
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


module.exports = function (tmpdir, sandbox, callback) {
  var
  config  = sandbox.config,
  timer   = stopwatch(),
  outdir  = path.join(tmpdir, 'views');

  N.runtime.views = {};

  try {
    fstools.mkdirSync(outdir);
  } catch (err) {
    callback(err);
    return;
  }

  async.forEachSeries(_.keys(config.packages), function (pkgName, next) {
    var
    viewsConfig   = config.packages[pkgName].views,
    viewsOutfile  = path.join(outdir, pkgName + '.js');

    if (!viewsConfig) {
      next();
      return;
    }

    processViews(viewsOutfile, viewsConfig, next);
  }, function (err) {
    N.logger.info('Processed views section ' + timer.elapsed);
    callback(err);
  });
};
