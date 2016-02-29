'use strict';


const _ = require('lodash');


module.exports = function (sandbox) {
  _.forEach(sandbox.config.packages, pkg => {
    _.forEach(pkg.files.bin, file_info => {
      sandbox.bundler.createClass('file', {
        logicalPath: file_info.path,
        plugins: [ 'load_bin' ]
      });
    });
  });
};
