'use strict';


/*global N*/


// 3rd-party
var async = require('nlib').Vendor.Async;


// 3rd-party
var treeSet = require('nlib').Support.tree.set;


// internal
var findPaths = require('../utils').findPaths;


////////////////////////////////////////////////////////////////////////////////


// **WARNING** NON-THREAD-SAFY, so block can contain ONLY SYNC CALLS
//
// - change N.filter.{before|after} to understand relative api_path
// - execute given block (second arguments)
// - restore original N.filter.{before|after}
function mangle_filter_assigner(path, block) {
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


module.exports = function growTree(lookup, callback) {
  var tree = {};

  async.forEachSeries(lookup, function (options, next) {
    findPaths(options, function (err, pathnames) {
      if (err) {
        next(err);
        return;
      }

      pathnames.forEach(function (pathname) {
        var leaf;

        // **WARNING** NON-THREAD-SAFY, so block can contain ONLY SYNC CALLS
        //
        // - change N.filter.{before|after} to understand relative api_path
        // - execute given block (second arguments)
        // - restore original N.filter.{before|after}
        mangle_filter_assigner(pathname.api, function () {
          leaf = pathname.require();
        });

        if ('function' === leaf.__init__) {
          // **WARNING** NON-THREAD-SAFY, so block can contain ONLY SYNC CALLS
          //
          // - change N.filter.{before|after} to understand relative api_path
          // - execute given block (second arguments)
          // - restore original N.filter.{before|after}
          mangle_filter_assigner(pathname.api, function () {
            leaf = leaf.__init__();
          });
          delete leaf.__init__;
        }

        treeSet(tree, pathname.api, leaf);
      });

      next();
    });
  }, function (err) {
    callback(err, tree);
  });
};
