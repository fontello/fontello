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
var stopWatch = require('./utils').stopWatch;
var growTree  = require('./server/grow_tree');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, config, callback) {
  var
  timer   = stopWatch(),
  outdir  = path.join(tmpdir, 'server');

  try {
    fstools.mkdirSync(outdir);

    _.each(config.packages, function (pkgConfig, pkgName) {
      var filename = path.join(outdir, pkgName + '.js'), tree;

      if (pkgConfig.server) {
        tree = growTree(pkgConfig.server.files);

        // merge subtree into main tree
        deepMerge(N.server, tree);

        // write clientside proxies
        fs.writeFileSync(filename,
          apiTree.browserifyServerTree(tree, 'this.N.server', {
            method: 'N.io.apiTree'
          }));
      }
    });
  } catch (err) {
    callback(err);
    return;
  } finally {
    N.logger.info('Processed server section ' + timer.elapsed);
  }

  callback();
};
