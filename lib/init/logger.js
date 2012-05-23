/*global nodeca*/


"use strict";


// 3rd-party
var log4js  = require('log4js');


////////////////////////////////////////////////////////////////////////////////


var LOGS_PATH = require('path').resolve(__dirname, '../../log');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (next) {
  log4js.addAppender(log4js.fileAppender(
    require('path').join(LOGS_PATH, nodeca.runtime.env + '.log')
  ));

  nodeca.logger = log4js.getLogger();
  next();
};
