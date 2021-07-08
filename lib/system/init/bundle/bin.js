'use strict';


module.exports = function (sandbox) {
  for (let pkg of Object.values(sandbox.config.packages)) {
    for (let file_info of pkg.files.bin || []) {
      sandbox.bundler.createClass('file', {
        logicalPath: file_info.path,
        plugins: [ 'load_bin' ]
      });
    }
  }
};
