
'use strict';

const exec = require('mz/child_process').exec;


module.exports = function (N) {
  // Try to rebuild assets if needed
  N.wire.before('reload', function* rebuild_assets() {
    yield exec([ process.mainModule.filename, 'assets' ].join(' '), {
      cwd: process.cwd(),
      env: process.env,
      timeout: 120 * 1000
    });
  });
};
