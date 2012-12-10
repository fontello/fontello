// `server` section processor
//
//      .
//      |- /server/
//      |   |- <package>.js
//      |   `- ...
//      `- ...
//


'use strict';


/*global N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _       = require('underscore');
var apiTree = require('nlib').ApiTree;
var async   = require('nlib').Vendor.Async;
var fstools = require('nlib').Vendor.FsTools;


// internal
var findPaths = require('./utils').findPaths;
var deepMerge = require('./utils').deepMerge;
var growTree  = require('./server/grow_tree');


////////////////////////////////////////////////////////////////////////////////


function processServer(outfile, config, callback) {
  growTree(config.lookup, function (err, tree) {
    if (err) {
      callback(err);
      return;
    }

    // merge subtree into main tree
    deepMerge(N.server, tree);

    // browserify subtree
    fs.writeFile(outfile, apiTree.browserifyServerTree(tree, 'this.N.server', {
      method: 'N.io.apiTree'
    }), callback);
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, config, callback) {
  async.forEachSeries(_.keys(config.packages), function (pkgName, next) {
    var
    serverConfig   = config.packages[pkgName].server,
    serverOutfile  = path.join(tmpdir, 'server', pkgName + '.js');

    if (!serverConfig) {
      next();
      return;
    }

    fstools.mkdir(path.dirname(serverOutfile), function (err) {
      if (err) {
        next(err);
        return;
      }

      processServer(serverOutfile, serverConfig, next);
    });
  }, callback);
};
