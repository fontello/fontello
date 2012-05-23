"use strict";


/*global nodeca, _*/


// stdlib
var path = require('path');


// nodeca
var HashTree  = require('nlib').Support.HashTree;


// 3rd-party
var Faye      = require('faye');


////////////////////////////////////////////////////////////////////////////////


var realtime = module.exports = {
  activeClients: 0
};


////////////////////////////////////////////////////////////////////////////////


var noop = function () {};


////////////////////////////////////////////////////////////////////////////////


function handle_rpc(msg, cb) {
  var env, fn = HashTree.get(nodeca.server, msg.method);

  if (msg.version !== nodeca.runtime.version) {
    (cb || noop)({
      version:  nodeca.runtime.version,
      error:    'Nodeca client mismatch'
    });
    return;
  }

  if (!fn) {
    (cb || noop)({
      version:  nodeca.runtime.version,
      error:    'Unknown server method: ' + msg.method
    });
    return;
  }

  // prefill environment
  env = {
    request: {
      origin: 'RT',
      method: msg.method,
      namespace: msg.method.split('.').shift()
    },
    session: {
      // FIXME: use req.session instead
      theme: 'desktop',
      lang: nodeca.config.locales.default
    },
    response: {
      data: {},
      layout: 'default',
      view: msg.method
    }
  };

  nodeca.filters.run(msg.method, msg.params, fn, function (err) {
    if (err) {
      nodeca.logger.error(err.stack || err.toString());
    }

    (cb || noop)({
      version:  nodeca.runtime.version,
      error:    (err ? err.toString() : null),
      result:   env.response
    });
  }, env);
}


////////////////////////////////////////////////////////////////////////////////


realtime.attach = function attach(server, next) {
  var faye = new Faye.NodeAdapter({mount: '/faye', timeout: 45});

  if (process.env.FAYE_LOGLEVEL) {
    // This produces lots of logs, which are usefull
    // only during development of RT things
    Faye.Logging.logLevel = process.env.FAYE_LOGLEVEL;
  }

  // FIXME: Replace dummy active_clients inc/dec with real heartbeat/timeouts
  faye.bind('handshake',  function () { realtime.activeClients++; });
  faye.bind('disconnect', function () { realtime.activeClients--; });


  var curr_users_count = 0;
  setInterval(function () {
    if (realtime.activeClients !== curr_users_count) {
      curr_users_count = realtime.activeClients;
      faye.getClient().publish('/stats/users_online', curr_users_count);
    }
  }, 10000);


  // subscribe handler
  faye.bind('handshake', function (clientId) {
    var channel = '/rpc-' + clientId;
    faye.getClient().subscribe(channel + '-req', function (data) {
      handle_rpc(data.msg, function (msg) {
        faye.getClient().publish(channel, {id: data.id, msg: msg});
      });
    });
  });

  // client gone - unsubscribe
  faye.bind('disconnect', function (clientId) {
    faye.getClient().unsubscribe('/rpc-' + clientId + '-req');
  });

  faye.attach(server);
  next();
};
