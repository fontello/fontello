// `server` section processor
//


'use strict';


/*global underscore, N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _       = underscore;
var async   = require('async');
var fstools = require('fs-tools');


// internal
var treeSet   = require('../../support').tree.set;
var apiTree   = require('./utils').apiTree;
var findPaths = require('./utils').findPaths;
var deepMerge = require('./utils').deepMerge;
var stopwatch = require('./utils').stopwatch;


////////////////////////////////////////////////////////////////////////////////


// **WARNING** NON-THREAD-SAFY, so block can contain ONLY SYNC CALLS
//
// - change N.filter.{before|after} to understand relative api_path
// - execute given block (second arguments)
// - restore original N.filter.{before|after}
function mangleFilterAssigner(path, block) {
  // make proxies
  ['before', 'after', 'ensure'].forEach(function (chain) {
    var _chain = '@@' + chain;
    N.filters[_chain] = N.filters[chain];
    N.filters[chain] = function (bucket, weight, fn) {
      if ('@' === bucket[0]) {
        // Scenario: `@`, `@.users`
        bucket = path + bucket.substr(1);
      }

      return N.filters[_chain](bucket, weight, fn);
    };
  });

  // make proxy for validation
  var _validate = N.validate;

  N.validate = function (apiPath, schema) {
    if (!schema) {
      // Scenario: validate({ ... })
      schema  = apiPath;
      apiPath = path;
    } else if (apiPath) {
      // Scenario: validate('foobar', { ... });
      apiPath = path + '.' + apiPath;
    }

    return _validate(apiPath, schema);
  };

  N.validate.test = _validate.test;

  // execute block
  block();

  // restore original functions
  ['before', 'after', 'ensure'].forEach(function (chain) {
    var _chain = '@@' + chain;
    N.filters[chain] = N.filters[_chain];
    delete N.filters[_chain];
  });

  N.validate = _validate;
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, sandbox, callback) {
  var
  config  = sandbox.config,
  timer   = stopwatch(),
  outdir  = path.join(tmpdir, 'server');

  try {
    fstools.mkdirSync(outdir);

    _.each(config.packages, function (pkgConfig, pkgName) {
      var filename = path.join(outdir, pkgName + '.js'), tree;

      if (pkgConfig.server) {
        tree = {};

        pkgConfig.server.files.forEach(function (pathname) {
          var leaf;

          // **WARNING** NON-THREAD-SAFY, so block can contain ONLY SYNC CALLS
          //
          // - change N.filter.{before|after} to understand relative api_path
          // - execute given block (second arguments)
          // - restore original N.filter.{before|after}
          mangleFilterAssigner(pathname.apiPath, function () {
            leaf = pathname.require();
          });

          if ('function' === leaf.__init__) {
            // **WARNING** NON-THREAD-SAFY, so block can contain ONLY SYNC CALLS
            //
            // - change N.filter.{before|after} to understand relative api_path
            // - execute given block (second arguments)
            // - restore original N.filter.{before|after}
            mangleFilterAssigner(pathname.apiPath, function () {
              leaf = leaf.__init__();
            });
            delete leaf.__init__;
          }

          treeSet(tree, pathname.apiPath, leaf);
        });

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
