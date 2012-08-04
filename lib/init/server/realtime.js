"use strict";


/*global nodeca, _*/


// 3rd-party
var Faye = require('faye');


////////////////////////////////////////////////////////////////////////////////


module.exports.activeClients = 0;


////////////////////////////////////////////////////////////////////////////////


// attaches faye adapter to the `server`
//
module.exports.attach = function attach(server, next) {
  var faye = new Faye.NodeAdapter({ mount: '/faye' });

  if (process.env.FAYE_LOGLEVEL) {
    // This produces lots of logs, which are usefull
    // only during development of RT things.
    // USAGE: FAYE_LOGLEVEL=info ./fontello.js server
    Faye.Logging.logLevel = process.env.FAYE_LOGLEVEL;
  }

  // FIXME: Replace dummy active_clients inc/dec with real heartbeat/timeouts
  faye.bind('handshake',  function () { module.exports.activeClients++; });
  faye.bind('disconnect', function () { module.exports.activeClients--; });

  var curr_users_count = 0;
  setInterval(function () {
    if (module.exports.activeClients !== curr_users_count) {
      curr_users_count = module.exports.activeClients;
      faye.getClient().publish('/stats/users_online', curr_users_count);
    }
  }, 10000);

  faye.attach(server);
  next();
};
