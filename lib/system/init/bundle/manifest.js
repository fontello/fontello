'use strict';


const path    = require('path');
const write   = require('write-file-atomic');
const Promise = require('bluebird');


module.exports = function (sandbox) {
  let manifest_path = path.join(sandbox.N.mainApp.root, 'assets', 'server',
    `manifest-${sandbox.N.environment}.json`);

  let manifest = {
    files: sandbox.files,
    distribution: sandbox.assets_map
  };

  return Promise.fromCallback(cb =>
    write(manifest_path, JSON.stringify(manifest, null, 2), cb));
};
