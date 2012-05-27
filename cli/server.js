"use strict";


/*global nodeca*/


// nodeca
var NLib = require('nlib');


// 3rd-party
var Async = NLib.Vendor.Async;


module.exports.parserParameters= {
  version:      nodeca.runtime.version,
  addHelp:      true,
  help:         'start fontello server',
  description:  'Start fontello server'
};


module.exports.commandLineArguments = [];


module.exports.run = function (args, callback) {
  Async.series([
    require('../lib/init/logger'),

    NLib.init.loadServerApiSubtree,
    NLib.init.loadSharedApiSubtree,
    NLib.init.loadClientApiSubtree,
    NLib.init.initTranslations,
    NLib.init.buildBundles,

    require('../lib/init/assets'),

    NLib.init.initRouter,

    require('../lib/init/cronjob'),
    require('../lib/init/server')
  ], callback);
};
