"use strict";


/*global N*/


// N
var NLib = require('nlib');


// 3rd-party
var Async   = NLib.Vendor.Async;
var FsTools = NLib.Vendor.FsTools;


module.exports.parserParameters = {
  version:      N.runtime.version,
  addHelp:      true,
  help:         'start fontello server',
  description:  'Start fontello server'
};


module.exports.run = function (args, callback) {
  Async.series([
    function (next) { N.logger.debug('Init app...'); next(); },
    require('../lib/init/app'),

    function (next) { N.logger.debug('Init router...'); next(); },
    NLib.InitStages.initRouter,

    function (next) { N.logger.debug('Init cronjob...'); next(); },
    require('../lib/init/cronjob'),

    function (next) { N.logger.debug('Init server...'); next(); },
    require('../lib/init/server')
  ], callback);
};
