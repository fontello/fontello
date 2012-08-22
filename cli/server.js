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
    NLib.init.loadServerApiSubtree,
    NLib.init.loadSharedApiSubtree,
    NLib.init.loadClientApiSubtree,
    NLib.init.initRouter,

    NLib.init.initTranslations,

    require('../lib/init/cronjob'),

    require('../lib/init/assets'),
    require('../lib/init/server')
  ], callback);
};
