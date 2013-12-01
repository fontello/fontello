// Main application initializer. Executed as the most first step of the
// `cli/server.js` and does following:
//
//  - fetches all bin files of all packages
//  - compiles styles client trees for all packages
//  - find and read all viewws
//  - find and prepare all server methods
//  - prepares bundles client js files for all packages containing:
//    - i18n of the package
//    - client methods
//    - server methods wrapers
//    - views
//  - output bundled files into the `public/assets` dir
//  - initialize router


'use strict';


// stdlib
var fs = require('fs');


// 3rd-party
var _       = require('lodash');
var async   = require('async');
var fstools = require('fs-tools');


// internal
var stopwatch     = require('./utils/stopwatch');
var readPkgConfig = require('./bundle/utils/read_pkg_config');


////////////////////////////////////////////////////////////////////////////////


var PROCESSING_QUEUE = [
  './bundle/mincer'
, './bundle/bin'
, './bundle/styles'
, './bundle/i18n'
, './bundle/views'
, './bundle/server'
, './bundle/router'
  // client depends on router, because we are bundling routes into N
, './bundle/client'
, './bundle/bundles'
, './bundle/manifest'
];


////////////////////////////////////////////////////////////////////////////////


function prepareProcessingQueue(sandbox) {
  return _.map(PROCESSING_QUEUE, function (modulePath) {
    var processor = require(modulePath);

    switch (processor.length) {
    case 1: // Sync processor.
      return function syncProcessorWrapper(next) {
        try {
          processor(sandbox);
          next();
        } catch (err) {
          next(err);
        }
      };

    case 2: // Async processor.
      return async.apply(processor, sandbox);

    default:
      throw new Error('Bundle processor function must accept exactly 1 (sync) ' +
                      'or 2 (async) arguments.');
    }
  });
}


module.exports = function (N) {
  var timer = stopwatch();

  N.wire.on('init:bundle', function bundle_all(N, callback) {
    var sandbox = { N: N }, tmpdir;

    N.logger.info('Bundler: started');

    // schedule files cleanup upon normal exit
    process.on('exit', function (code) {
      if (0 !== +code) {
        console.warn('Unclean exit. Bundled files left in \'' + tmpdir + '\'');
        return;
      }

      try {
        N.logger.debug('Removing %s ...', tmpdir);
        fstools.removeSync(tmpdir);
      } catch (err) {
        N.logger.error('Failed to remove %s, %s ', tmpdir, String(err));
      }
    });

    try {
      sandbox.tmpdir = tmpdir = fstools.tmpdir();
      sandbox.config = readPkgConfig(N.runtime.apps);
      fs.mkdirSync(tmpdir);
    } catch (err) {
      callback(err);
      return;
    }

    N.logger.info('Packages configs loaded %s', timer.elapsed);

    async.series(prepareProcessingQueue(sandbox), function (err) {
      if (err) {
        callback(err);
        return;
      }

      N.logger.info('Bundler: finished %s', timer.elapsed);
      callback();
    });
  });
};
