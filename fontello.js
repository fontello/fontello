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
// Catch unexpected exceptions
//


process.on('uncaughtException', function (err) {
  try {
    nodeca.logger.warn('Uncaught exception');
    nodeca.logger.error(err);
  } catch (err) {
    // THIS SHOULD NEVER-EVER-EVER HAPPEN -- THIS IS A WORST CASE SCENARIO
    // USAGE: ./fontello.js 2>/var/log/fontello-cf.log
    console.error(err.stack || err.toString());
  }
});


//
// Run application
//


app.run();
