"use strict";


// stdlib
var path = require("path");


// 3rd-party
var async = require("async");


// internal
var Application = require('./runner/application');


////////////////////////////////////////////////////////////////////////////////


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


exports.bootstrap = function (appRoot, appConfig) {
  var N = global.N = {
    runtime: {
      mainApp: new Application(appRoot, appConfig)
    }
  };

  // TODO: remove global underscore
  global._ = require("underscore");

  //
  // Logs "low-level" errors
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
    async.apply(require('./runner/initialize'), N),
    async.apply(require('./runner/exec_cli'), N)
  ], function (err) {
    if (err) {
      logFatalError(formatError(err));
      process.exit(1);
    }
  });
};
