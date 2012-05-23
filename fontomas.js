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
// Inject some features
//


nodeca.hooks.init.before('init-start',    require('./lib/init/logger'));
nodeca.hooks.init.after('bundles',        require('./lib/init/assets'));
nodeca.hooks.init.after('init-complete',  require('./lib/init/cronjob'));
nodeca.hooks.init.after('init-complete',  require('./lib/init/server'));


//
// Run application
//


app.run();
