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


module.exports.commandLineArguments = [
  {
    args: ['--faye-loglevel'],
    options: {
      help: 'Set loglevel for Faye. Reasonable value for debugging is `info`.',
      dest: 'fayeLogLevel',
      type: 'string'
    }
  },
  {
    args: ['--no-assets-compression'],
    options: {
      help:   'Disable assets compression for faster server up.',
      dest:   'skipAssetsCompression',
      action: 'storeTrue'
    }
  }
];


module.exports.run = function (args, callback) {
  Async.series([
    require('../lib/init/logger'),

    NLib.init.loadModels,
    NLib.init.loadServerApiSubtree,
    NLib.init.loadSharedApiSubtree,
    NLib.init.loadClientApiSubtree,
    NLib.init.loadSettings,
    NLib.init.initTranslations,
    NLib.init.buildBundles,

    require('../lib/init/assets')(args),

    NLib.init.initRouter,

    require('../lib/init/cronjob'),
    require('../lib/init/server')(args)
  ], callback);
};
