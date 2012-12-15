// Final bundle generator


'use strict';


// 3rd-party
var async = require('nlib').Vendor.Async;


// internal
var stopWatch = require('./utils').stopWatch;


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, config, callback) {
  var timer = stopWatch();

  async.series([
    async.apply(require('./bundle/concat'), tmpdir, config),
    async.apply(require('./bundle/mincer'), tmpdir, config)
  ], function (err) {
    N.logger.info('Finished final bundling ' + timer.elapsed);
    callback(err);
  });
};
