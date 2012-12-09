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
    require('../lib/init/app'),

    NLib.InitStages.initRouter,

    require('../lib/init/cronjob'),
    require('../lib/init/server')
  ], callback);
};
