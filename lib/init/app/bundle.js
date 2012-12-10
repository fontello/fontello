// Final bundle generator


'use strict';


// 3rd-party
var async = require('nlib').Vendor.Async;


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, config, callback) {
  async.series([
    async.apply(require('./bundle/concat'), tmpdir, config),
    async.apply(require('./bundle/mincer'), tmpdir, config)
  ], callback);
};
