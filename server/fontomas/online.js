/*global nodeca*/


"use strict";


////////////////////////////////////////////////////////////////////////////////


var realtime = require('../../lib/init/server/realtime');


////////////////////////////////////////////////////////////////////////////////


module.exports = function app(params, callback) {
  if (!this.origin.rpc) {
    callback({statusCode: 400, body: 'RPC only'});
    return;
  }

  this.response.data.users = realtime.activeClients;

  // done
  callback();
};
