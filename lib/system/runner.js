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


var fs     = require('fs');
var path   = require('path');
var domain = require('domain');
var async  = require('async');


// internal
var Application = require('./runner/application');


////////////////////////////////////////////////////////////////////////////////


// Amount of concurrently performed file write operations in fault logger.
var FAULT_LOGGER_CONCURRENCY = 1;


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


exports.bootstrap = function (options) {
  var N, faultLoggerDomain, faultLoggerQueue;

  N = global.N = {
    io:       require('./io'),
    runtime:  {
      args:     process.argv.slice(2),
      mainApp:  new Application(options)
    }
  };

  //
  // Domain for logging "low-level" errors, logger errors safe, so that if logger
  // will fail, it will not get into endless loop, but will write into STDERR
  //

  faultLoggerDomain = domain.create();

  faultLoggerQueue = async.queue(function (message, callback) {
    var fileList = [];

    process.stderr.write(message);

    try {
      N.config.logger.system.forEach(function (config) {
        var filename = path.resolve(N.runtime.mainApp.root, config.file);

        if (-1 === fileList.indexOf(filename)) {
          fileList.push(filename);
        }
      });
    } catch (err) {
      console.error('Fault logger cannot detect log files to write.');
    }

    async.forEach(fileList, function (filename, next) {
      fs.appendFile(filename, message, function (err) {
        if (err) {
          console.error('Unable to perform direct low-level write to system ' +
                        'log file: %s', err);
        }
        next();
      });
    }, callback);
  }, FAULT_LOGGER_CONCURRENCY);

  // THIS SHOULD NEVER-EVER-EVER HAPPEN -- THIS IS A WORST CASE SCENARIO
  faultLoggerDomain.on('error', function (err) {
    faultLoggerQueue.push('Logger failed to write: ' + (err.stack || err) + '\n');
  });

  function logFatalError(err) {
    faultLoggerDomain.run(function () {
      N.logger.fatal(formatError(err));
    });
  }

  //
  // Catch unexpected exceptions
  //

  process.on('uncaughtException', function (err) {
    // This check is needed only for Node 0.8
    if (!err.domain_thrown) {
      logFatalError('UNCAUGHT EXCEPTION !!! ' + formatError(err));
    }
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


  try {
    // preload & bootstrap
    require('./runner/initialize')(N);

    // Load 'init:**' events handlers
    require('./init')(N);

    // execute cli script
    require('./runner/exec_cli')(N, function(err) {
      if (err) {
        logFatalError(err);
        process.exit(1);
        return;
      }
    });
  } catch (err) {
    logFatalError(err);
    process.exit(1);
    return;
  }
};
