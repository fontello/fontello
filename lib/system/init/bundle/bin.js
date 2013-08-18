// `bin` section processor


'use strict';


var _         = require('lodash');
var findPaths = require('./utils/find_paths');
var stopwatch = require('../utils/stopwatch');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (sandbox) {
  var timer   = stopwatch()
    , N       = sandbox.N;

  // When Mincer is asked for a file, this file must be within roots, that
  // Mincer knows about. See: https://github.com/nodeca/mincer/issues/51
  _.forEach(sandbox.config.packages, function (pkgConfig) {
    _.forEach(pkgConfig.bin, function (resource) {
      sandbox.assets.environment.appendPath(resource.root);
    });

    findPaths(pkgConfig.bin, function (file) {
      sandbox.assets.files.push(file);
    });
  });

  N.logger.info('Processed bin section %s', timer.elapsed);
};
