'use strict';


/*global N*/


// stdlib
var path = require('path');


// internal
var styles      = require('./processors/styles');
var eachPackage = require('../each_package');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (next) {
  eachPackage(N.runtime.apps, function (name, root, config, nextPackage) {
    config = config.styles;

    if (!config) {
      nextPackage();
      return;
    }

    // resolve root
    config.root = path.join(root, config.root);

    styles.compile(config, function (err, css) {
      if (err) {
        nextPackage(err);
        return;
      }

      console.log(css);
      nextPackage();
    });
  }, next);
};
