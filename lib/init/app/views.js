// `views` section processor
//


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
var stopWatch = require('./utils').stopWatch;


////////////////////////////////////////////////////////////////////////////////


function processViews(outfile, config, filterPath, callback) {
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
          filename:   String(pathname),
          filterPath: filterPath
        }, next);
      },
      function (next) {
        // compile client-side views (string sources of functions)
        views.engines[pathname.extname].client(str, {
          filename:   String(pathname),
          filterPath: filterPath
        }, next);
      }
    ], function (err, results) {
      // expose compiled data into the tree
      results = results || [];

      viewsTree[pathname.api] = {
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
  timer   = stopWatch(),
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

    // Function that is responsible for include directive monkey-patching
    // FIXME: seems like we will not use raw jade include directive, due to
    //        complexity of implementing right tracking of file's api path
    //        when it's included by this directive
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
  }, function (err) {
    N.logger.info('Processed views section ' + timer.elapsed);
    callback(err);
  });
};
