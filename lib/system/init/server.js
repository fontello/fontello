'use strict';


const exec = require('util').promisify(require('child_process').exec);


module.exports = function (N) {
  // Try to rebuild assets if needed
  N.wire.before('reload', async function rebuild_assets() {
    await exec([ process.mainModule.filename, 'assets' ].join(' '), {
      cwd: process.cwd(),
      env: process.env,
      timeout: 120 * 1000
    });
  });
};
