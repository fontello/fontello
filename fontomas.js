#!/usr/bin/env node

/*global nodeca*/

"use strict";


// nodeca
var NLib = require('nlib');


var app = NLib.Application.create({
  name: 'fontomas',
  root: __dirname
});


process.on('uncaughtException', function (err) {
  nodeca.logger.warn('Uncaught exception');
  nodeca.logger.error(err);
});


// temporary fix for logger
nodeca.hooks.init.before('bundles', function (next) {
  var log4js  = require('log4js');

  log4js.addAppender(log4js.fileAppender(require('path').join(
    nodeca.runtime.apps[0].root, 'log', nodeca.runtime.env + '.log'
  )));

  nodeca.logger = log4js.getLogger();
  next();
});


// preset version
nodeca.hooks.init.before('bundles', function (next) {
  nodeca.runtime.version = require('./package.json').version;
  next();
});


// Prepare mincer
nodeca.hooks.init.after('bundles', require('./lib/init/http_assets'));


// Remove old downloads
nodeca.hooks.init.before('init-complete', function (next) {
  var downloads_path = require('path').resolve(__dirname, 'public/download');
  nodeca.logger.warn("Cleaning obsolet downloads. Removing: " + downloads_path);
  NLib.Vendor.FsTools.remove(downloads_path, next);
});


// Start socket.io and http servers
nodeca.hooks.init.after('init-complete',  require('./lib/init/http_server'));


// run application
app.run();
