"use strict";


// internal
var fontConfig = require('../lib/font_config');


module.exports.parserParameters = {
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


module.exports.run = function (N, args, callback) {
  var input, config;

  try {
    input = require(args.input);
  } catch (err) {
    callback(err);
    return;
  }

  try {
    config = JSON.stringify(fontConfig(input), null, '  ');
    require('fs').writeFileSync(args.output, config);
  } catch (err) {
    callback(err);
    return;
  }

  callback();
};
