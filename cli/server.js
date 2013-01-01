"use strict";


/*global N*/


// 3rd-party
var async = require('async');


module.exports.parserParameters = {
  version:      N.runtime.version,
  addHelp:      true,
  help:         'start fontello server',
  description:  'Start fontello server'
};

module.exports.commandLineArguments = [
  {
    args: ['--test'],
    options: {
      help:   'Start server an terminates immedeately, with code 0 on init success.',
      action: 'storeTrue'
    }
  }
];


module.exports.run = function (args, callback) {

  async.series([
    function (next) { N.logger.debug('Init app...'); next(); },
    require('../lib/init/app'),

    function (next) { N.logger.debug('Init cronjob...'); next(); },
    require('../lib/init/cronjob'),

    function (next) { N.logger.debug('Init server...'); next(); },
    require('../lib/init/server')
  ], function (err) {
    if (err) {
      callback(err);
      return;
    }

    // for `--test` just exit on success
    if (args.test) {
      process.stdout.write('\nSetver exec test OK');
      process.exit(0);
    }

    callback();
  });
};
