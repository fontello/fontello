// `server` section processor: read methods handlers & assign to N.wire
//


'use strict';


var _ = require('lodash');


// internal
var stopwatch = require('../utils/stopwatch');
var findPaths = require('./utils/find_paths');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (sandbox) {
  var N     = sandbox.N
    , timer = stopwatch();

  _.forEach(sandbox.config.packages, function (pkgConfig) {
    // `server` section
    findPaths(pkgConfig.server, function (fsPath, apiPath) {
      var serverInit = require(fsPath);

      if (!_.isFunction(serverInit)) {
        N.logger.warn('Server module must return an initilizer function as the exports at %s', fsPath);
        return;
      }

      serverInit(N, 'server:' + apiPath);
    });

    // `internal` section
    findPaths(pkgConfig.internal, function (fsPath, apiPath) {
      var serverInit = require(fsPath);

      if (!_.isFunction(serverInit)) {
        N.logger.warn('Server module must return an initilizer function as the exports at %s', fsPath);
        return;
      }

      serverInit(N, 'internal:' + apiPath);
    });
  });

  N.logger.info('Processed internal section %s', timer.elapsed);
};
