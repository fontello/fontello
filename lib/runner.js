// This is a main entry point. It bootstraps and starts application and all
// initializers. Workflow as follows:
//
//  -> runner.bootstrap
//      -> initialize
//          -> read main config and configs of all sub-applications
//          -> init logger
//          -> init all applications
//      -> exec cli
//          -> load CLI commands
//          -> run requested CLI command
//


"use strict";


// 3rd-party
var async = require("async");


// internal
var Application = require('./runner/application');


////////////////////////////////////////////////////////////////////////////////


// dummy helper to beautify error.
// used when fatal error caught.
function formatError(err) {
  var msg, stack;

  msg   = String(err);
  stack = err.stack || '';

  if (err.original) {
    msg += '\n' + String(err.original);
    stack = err.original.stack || stack;
  }

  stack = stack.split('\n').slice(1).join('\n');

  if (stack) {
    msg += "\n" + stack;
  }

  return msg;
}


////////////////////////////////////////////////////////////////////////////////


exports.bootstrap = function (options, args, callback) {
  var N = global.N = {
    io:       require('./io'),
    runtime:  {
      args:     args ? args.slice() : process.argv.slice(2),
      mainApp:  new Application(options)
    }
  };

  global.underscore = require('underscore');

  //
  // Logs "low-level" errors, logger errors safe, so that if logger will fail
  // it will not get into endless loop, but will write into STDERR
  //

  function logFatalError(msg) {
    try {
      N.logger.fatal(msg);
    } catch (loggerError) {
      // THIS SHOULD NEVER-EVER-EVER HAPPEN -- THIS IS A WORST CASE SCENARIO
      // USAGE: ./N.js 2>/var/log/N-cf.log
      process.stderr.write('\nLogger failed write: ' + loggerError.stack);
      process.stderr.write('\nOriginal error happened: ' + msg);
    }
  }

  //
  // Catch unexpected exceptions
  //

  process.on('uncaughtException', function (err) {
    logFatalError('UNCAUGHT EXCEPTION !!! ' + formatError(err));
  });

  //
  // Handle SIGnals
  //

  function shutdown_gracefully() {
    N.logger.info('Shutting down...');
    process.exit(0);
  }

  // shutdown gracefully on SIGTERM :
  process.on('SIGTERM', shutdown_gracefully);
  process.on('SIGINT',  shutdown_gracefully);

  // Notify about unclean exit
  process.on('SIGQUIT', function () {
    process.exit(1);
  });

  async.series([
    require('./runner/initialize'),
    require('./runner/exec_cli')
  ], callback || function (err) {
    if (err) {
      logFatalError(formatError(err));
      process.exit(1);
    }
  });
};
