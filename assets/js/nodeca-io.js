/*global window, $, _, Faye, nodeca*/


//= depend_on nodeca
//= require faye-browser


(function () {
  'use strict';


  // exported IO object
  nodeca.io = {};


  // cache of scheduled calls, that will be
  // run once `nodeca.io.init()` called
  var scheduled = {};


  // provide stubbed version of io by default
  _.each(['on', 'off', 'rpc', 'emit'], function (name) {
    scheduled[name] = [];
    nodeca.io[name] = function () {
      scheduled[name].push(arguments);
    };
  });


  nodeca.io.init = function () {
    var // bayeux client
        bayeux = new Faye.Client('/faye'),
        // internal cache
        RPC = {
          req_channel:  '/x/rpc-req/' + window.REALTIME_ID,
          res_channel:  '/x/rpc-res/' + window.REALTIME_ID,
          callbacks:    {},
          last_msg_id:  0
        };

    // provide real methods
    nodeca.io.on    = _.bind(bayeux.subscribe, bayeux);
    nodeca.io.off   = _.bind(bayeux.unsubscribe, bayeux);
    nodeca.io.emit  = _.bind(bayeux.publish, bayeux);

    // subscribe for RPC responses
    bayeux.subscribe(RPC.res_channel, function (data) {
      var callback = RPC.callbacks[data.id];

      if (!callback) {
        // unknown response id
        return;
      }

      delete RPC.callbacks[data.id];
      callback(data.msg);
    });

    // provide nodeca.runtime.rpc method
    nodeca.io.rpc = function (name, params, callback) {
      var data      = {id: RPC.last_msg_id++},
          attempts  = 0,
          try_send;

      // prepare message
      data.msg = {
        version:  nodeca.runtime.version,
        method:   name,
        params:   params
      };

      // store callback for the response
      RPC.callbacks[data.id] = function (msg) {
        if (msg.version !== nodeca.runtime.version) {
          // TODO: implement software upgrade here
          nodeca.client.fontomas.util.notify('error', {layout: 'bottom'},
            '<strong>Application is outdated. Please ' +
            '<a href="/" style="text-decoration:underline">reload</a>' +
            ' page.</strong>');
          return;
        }

        (callback || $.noop)(msg.err, msg.result);
      };

      // send request
      bayeux.publish(RPC.req_channel, data).errback(function (err) {
        delete RPC.callbacks[data.id];
        (callback || $.noop)(err);
      });
    };

    // once init complete, run scheduled methods
    _.each(['on', 'off', 'rpc', 'emit'], function (name) {
      var args;

      while (scheduled[name].length) {
        args = scheduled[name].shift();
        nodeca.io[name].apply(null, args);
      }
    });
  };
}());
