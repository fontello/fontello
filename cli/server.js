"use strict";


/*global nodeca*/


// nodeca
var NLib = require('nlib');


// 3rd-party
var Async   = NLib.Vendor.Async;
var FsTools = NLib.Vendor.FsTools;


module.exports.parserParameters= {
  version:      nodeca.runtime.version,
  addHelp:      true,
  help:         'start fontello server',
  description:  'Start fontello server'
};


module.exports.run = function (args, callback) {
  Async.series([
    NLib.InitStages.loadServerApiSubtree,
    NLib.InitStages.loadSharedApiSubtree,
    NLib.InitStages.loadClientApiSubtree,
    NLib.InitStages.initRouter,
    NLib.InitStages.initTranslations,

    require('../lib/init/cronjob'),
    require('../lib/init/assets'),
    require('../lib/init/server')
  ], callback);
};
