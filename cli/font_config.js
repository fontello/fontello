"use strict";


/*global nodeca*/


// nodeca
var NLib = require('nlib');


// 3rd-party
var Async   = NLib.Vendor.Async;
var FsTools = NLib.Vendor.FsTools;


// internal
var fontConfig = require('../lib/font_config');


module.exports.parserParameters= {
  version:      nodeca.runtime.version,
  addHelp:      true,
  help:         'prepare font configuration',
  description:  'prepare font configuration'
};


module.exports.commandLineArguments = [
  {
    args: ['-i', '--input'],
    options: {
      dest:     'input',
      help:     'user config',
      type:     'string',
      metavar:  'FILE',
      required: true
    }
  },
  {
    args: ['-o', '--output'],
    options: {
      dest:     'output',
      help:     'resulting config',
      type:     'string',
      metavar:  'FILE',
      required: true
    }
  }
];


module.exports.run = function (args, callback) {
  Async.series([
    NLib.InitStages.loadServerApiSubtree,
    NLib.InitStages.loadSharedApiSubtree,
    NLib.InitStages.loadClientApiSubtree
  ], function (err) {
    var input, config;

    if (err) {
      callback(err);
      return;
    }

    try {
      input = require(args.input);
    } catch (err) {
      callback(err);
      return;
    }

    try {
      config = JSON.stringify(fontConfig(input));
      require('fs').writeFileSync(args.output, config);
    } catch (err) {
      callback(err);
      return;
    }

    callback();
  });
};
