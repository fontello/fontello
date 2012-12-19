// Final bundle generator


'use strict';


// 3rd-party
var async = require('nlib').Vendor.Async;


// internal
var stopWatch = require('./utils').stopWatch;


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, sandbox, callback) {
  var timer = stopWatch();

  async.series([
    async.apply(require('./bundle/concat'),   tmpdir, sandbox),
    async.apply(require('./bundle/manifest'), tmpdir, sandbox)
  ], function (err) {
    N.logger.info('Finished final bundling ' + timer.elapsed);
    callback(err);
  });
};
