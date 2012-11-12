#!/usr/bin/env node


/*global nodeca*/


"use strict";


var app = require('nlib').Application.create({
  name: 'fontomas',
  root: __dirname
});


//
// Preset application version
//


nodeca.runtime.version = require('./package.json').version;


//
// Preinitialize some basics
//


require('./lib/io');


//
// Catch unexpected exceptions
//


process.on('uncaughtException', function (err) {
  var msg, stack;

  try {
    msg   = 'UNCAUGHT EXCEPTION !!! ' + String(err);
    stack = err.stack || '';

    if (err.original) {
      msg += '\n' + String(err.original);
      stack = err.original.stack || stack;
    }

    msg += '\n' + stack.split('\n').slice(1).join('\n');

    nodeca.logger.fatal(msg);
  } catch (loggerError) {
    // THIS SHOULD NEVER-EVER-EVER HAPPEN -- THIS IS A WORST CASE SCENARIO
    // USAGE: ./nodeca.js 2>/var/log/nodeca-cf.log
    process.stderr.write('\nLogger failed write: ' + loggerError.stack);
    process.stderr.write('\nOriginal error happened: ' + msg);
  }
});


//
// Handle SIGnals
//


function shutdown_gracefully() {
  nodeca.logger.info('Shutting down...');
  process.exit(0);
}


// shutdown gracefully on SIGTERM :
process.on('SIGTERM', shutdown_gracefully);
process.on('SIGINT',  shutdown_gracefully);


//
// Register filters
//


require('./lib/filters');


//
// Run application
//


app.run();
