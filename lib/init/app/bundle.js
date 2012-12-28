// Final bundle generator - generates files on disk (public/assets)
//


'use strict';


/*global N*/


// 3rd-party
var async = require('async');


// internal
var stopwatch = require('./utils/stopwatch');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, sandbox, callback) {
  var timer = stopwatch();

  async.series([
    async.apply(require('./bundle/concat'),   tmpdir, sandbox),
    async.apply(require('./bundle/manifest'), tmpdir, sandbox)
  ], function (err) {
    N.logger.info('Finished final bundling ' + timer.elapsed);
    callback(err);
  });
};
