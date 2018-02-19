'use strict';


const path    = require('path');
const write   = require('util').promisify(require('write-file-atomic'));


module.exports = function (sandbox) {
  let manifest_path = path.join(sandbox.N.mainApp.root, 'assets', 'server',
    `manifest-${sandbox.N.environment}.json`);

  let manifest = {
    files: sandbox.files,
    distribution: sandbox.assets_map
  };

  return write(manifest_path, JSON.stringify(manifest, null, 2));
};
