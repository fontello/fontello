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


function add_subscription_filter(bayeux, subscriptionsWhitelist) {
  bayeux.addExtension({
    incoming: function (message, callback) {
      var allow;

      // allow any message from the server client
      if (bayeux.getClient().getClientId() === message.clientId) {
        callback(message);
        return;
      }

      // allow any non-subscription message
      if (!message.subscription) {
        callback(message);
        return;
      }

      allow = _.any(subscriptionsWhitelist, function (re) {
        return re.test(message.subscription);
      });

      // subscription channel is in whitelist
      if (allow) {
        callback(message);
        return;
      }

      message.error = "Subscription Denied";
      callback(message);
    }
  });
}


function add_publishing_filter(bayeux, publishingWhitelist) {
  bayeux.addExtension({
    incoming: function (message, callback) {
      var allow;

      // allow any message from the server client
      if (bayeux.getClient().getClientId() === message.clientId) {
        callback(message);
        return;
      }

      // allow any special-case messages
      if ('/meta/' === message.channel.substr(0, 6)) {
        callback(message);
        return;
      }

      allow = _.any(publishingWhitelist, function (re) {
        return re.test(message.subscription);
      });

      // subscription channel is in whitelist
      if (allow) {
        callback(message);
        return;
      }

      message.error = "Publishing Denied";
      callback(message);
    }
  });
}


////////////////////////////////////////////////////////////////////////////////


realtime.attach = function attach(server, next) {
  var faye = new Faye.NodeAdapter({mount: '/faye', timeout: 45});

  if (process.env.FAYE_LOGLEVEL) {
    // This produces lots of logs, which are usefull
    // only during development of RT things.
    // USAGE: FAYE_LOGLEVEL=info ./fontello.js
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


  //
  // Allow subscriptions from clients, only for whitelisted channels
  //


  add_subscription_filter(faye, [
    new RegExp('^/stats/'),
    new RegExp('^/x/[a-f0-9]{32}/rpc-res$')
  ]);


  //
  // Allow publish from client, only into whitelisted channels
  //


  add_publishing_filter(faye, [
    new RegExp('^/x/[a-f0-9]{32}/rpc-req$')
  ]);


  //
  // Process RPC requests
  //

  var CHANNEL_RE = new RegExp('^/x/([a-f0-9]{32})/rpc-req$');

  function process_rpc_message(secret, req) {
    handle_rpc(req.msg, function (res) {
      faye.getClient().publish('/x/' + secret + '/rpc-res', {
        id  : req.id,
        msg : res
      });
    });
  }

  faye.addExtension({
    incoming: function (message, callback) {
      var id, matches;

      // skip any messages from server
      if (faye.getClient().getClientId() === message.clientId) {
        callback(message);
        return;
      }

      matches = CHANNEL_RE.exec(message.channel);
      if (matches) {
        process_rpc_message(matches[1], message.data);
      }

      callback(message);
    }
  });


  faye.attach(server);
  next();
};
