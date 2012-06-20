/*global nodeca*/


"use strict";


////////////////////////////////////////////////////////////////////////////////


var realtime = require('../../lib/init/server/realtime');


////////////////////////////////////////////////////////////////////////////////


module.exports = function app(params, callback) {
  if (!this.origin.realtime) {
    callback('RT only');
    return;
  }

  this.response.data.users = realtime.activeClients;

  // done
  callback();
};
