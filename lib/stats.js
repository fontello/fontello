/*global nodeca*/


'use strict';


// stdlib
var path  = require('path');
var fs    = require('fs');


function start_logger(file) {
  var size = path.existsSync(file) ? fs.statSync(file).size : 0;

  return {write: function (str) {
    fs.open(file, 'a', function (err, fd) {
      if (err) {
        nodeca.logger.error("Failed open stats log file: " + err);
        return;
      }

      fs.write(fd, str, size, Buffer.byteLength(str), function (err) {
        if (err) {
          nodeca.logger.error("Failed write to stats log file: " + err);
        }

        fs.close(fd);
      });
    });
  }};
}


var logfile = path.join(nodeca.runtime.apps[0].root, 'log/fontello-stats.log');
var logger  = start_logger(logfile);


module.exports.push = function (stats) {
  var parts = [];

  try {
    parts.push((new Date).toISOString());
    parts.push(stats.user);
    parts.push(stats.glyphs);
    parts.push(stats.time);

    logger.write(parts.join('\t') + "\n");
  } catch (err) {
    nodeca.logger.warn("Failed write stat results");
    nodeca.logger.error(err);
  }
};
