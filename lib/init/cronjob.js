/*global nodeca*/


"use strict";


// 3rd-party
var cron = require('cron');


// nodeca
var NLib = require('nlib');


////////////////////////////////////////////////////////////////////////////////


var DOWNLOADS_PATH = require('path').resolve(__dirname, '../../public/download');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (next) {
  nodeca.logger.warn("Purging obsolet downloads. Removing: " + DOWNLOADS_PATH);
  NLib.Vendor.FsTools.remove(DOWNLOADS_PATH, function (err) {
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
          NLib.Vendor.FsTools.walk(DOWNLOADS_PATH, function (file, stat, next) {
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
};
