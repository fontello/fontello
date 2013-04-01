// Start server
//

"use strict";


////////////////////////////////////////////////////////////////////////////////


module.exports.parserParameters = {
  addHelp:      true,
  help:         'start nodeca server',
  description:  'Start nodeca server'
};


module.exports.commandLineArguments = [
  {
    args: ['--test'],
    options: {
      help:   'Start server an terminates immediately, ' +
              'with code 0 on init success.',
      action: 'storeTrue'
    }
  }
];


module.exports.run = function (N, args, callback) {

  N.wire.emit([
      'init:models',
      'init:migrations',
      'init:bundle',
      'init:server'
    ], N,

    function (err) {
      if (err) {
        callback(err);
        return;
      }

      // for `--test` just exit on success
      if (args.test) {
        process.stdout.write('Server exec test OK\n');
        process.exit(0);
      }

      callback();
    }
  );
};
