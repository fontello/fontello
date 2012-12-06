'use strict';


/*global N*/


// Initializes server tree


// stdlib
var path = require('path');


// internal
var growTree    = require('./processors/server-tree').growTree;
var eachPackage = require('../each_package');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (next) {
  eachPackage(N.runtime.apps, function (name, root, config, nextPackage) {
    config = config.server;

    if (!config) {
      nextPackage();
      return;
    }

    // resolve root
    config.root = path.join(root, config.root);

    // try auto-guess apiPrefix
    if (-1 === Object.getOwnPropertyNames(config).indexOf('apiPrefix')) {
      config.apiPrefix = name;
    }

    // collect files and "grow" server tree
    growTree(N.server, config, nextPackage);
  }, next);
};
