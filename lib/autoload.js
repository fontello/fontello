'use strict';

var walkSync = require('fs-tools').walkSync;
var path = require('path');

module.exports = function loadFilters(N) {
  walkSync(path.join(__dirname, 'autoload'), /\.js$/, function(file, stat) {
    // skip files when:
    // - filename starts with _, e.g.: /foo/bar/_baz.js
    // - dirname in path starts with _, e.g. /foo/_bar/baz.js
    if (file.match(/(^|\/|\\)_/)) { return; }

    if (stat.isFile()) {
      require(file)(N);
    }
  });
};
