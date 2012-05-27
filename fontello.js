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
  nodeca.logger.warn('Uncaught exception');
  nodeca.logger.error(err);
});


//
// Run application
//


app.run();
