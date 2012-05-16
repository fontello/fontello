#!/usr/bin/env node

/*global nodeca*/

"use strict";



// 3rd-party
var cron = require('cron');


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
  var downloads_path  = require('path').resolve(__dirname, 'public/download');

  nodeca.logger.warn("Purging obsolet downloads. Removing: " + downloads_path);
  NLib.Vendor.FsTools.remove(downloads_path, function (err) {
    var job;

    if (err) {
      next(err);
      return;
    }

    try {
      job = new cron.CronJob({
        // run every day at 00:00:00
        cronTime: '0 0 0 * * *',
        onTick: function () {
          var now = Date.now(), // current timestamp in ms
              max_age = 60 * 60 * 24 * 1000; // 1 day in ms

          nodeca.logger.warn("Cleaning downloads...");
          NLib.Vendor.FsTools.walk(downloads_path, function (file, stat, next) {
            if (max_age > now - Date.parse(stat.mtime)) {
              // file is fresh - no need to cleanup
              nodeca.logger.debug("Skipping file: " + file);
              next();
              return;
            }

            nodeca.logger.warn("Removing file: " + file);
            NLib.Vendor.FsTools.remove(file, next);
          }, function (err) {
            if (err) {
              nodeca.logger.warn("Failed cleanup downloads");
              nodeca.logger.error(err);
            }
          });
        },
        // do not start immediately
        start: false
      });
    } catch (err) {
      next(err);
      return;
    }

    job.start();
    next();
  });
});


// Start socket.io and http servers
nodeca.hooks.init.after('init-complete',  require('./lib/init/http_server'));


// run application
app.run();
