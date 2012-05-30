/**
 *  nodeca.io
 *
 *  This module provides realtime communication methods for nodeca/nlib based
 *  applications.
 *
 *  ##### IOReponse
 *
 *  `IOResponse` is a`jQuery.Deferred` compatible object, that exposes only
 *  _subscription_ methods: `then`, `done`, `fail`.
 **/


/*global window, $, _, Faye, nodeca*/


//= depend_on nodeca
//= require faye-browser


(function () {
  'use strict';


  var // cache of scheduled calls, that will be
      // run once `nodeca.io.init()` called
      scheduled = {},
      // registered events
      events = {};


  // exported IO object
  nodeca.io = {};


  // provide stubbed version of io by default
  _.each(['subscribe', 'unsubscribe', 'publish', 'rpc'], function (name) {
    scheduled[name] = [];
    nodeca.io[name] = function () {
      scheduled[name].push(arguments);
    };
  });


  //
  // Event related parts
  //


  /**
   *  nodeca.io.on(event, handler) -> Void
   *  - event (String)
   *  - handler (Function)
   *
   *  Registers `handler` for an `event`.
   *
   *
   *  ##### Known events
   *
   *  - `rpc:version-mismatch`
   **/
  nodeca.io.on = function on(event, handler) {
    if (!events[event]) {
      events[event] = [];
    }

    events[event].push(handler);
  };


  /**
   *  nodeca.io.off(event[, handler]) -> Void
   *  - event (String)
   *  - handler (Function)
   *
   *  Unsubscribes `handler` (or all handlers) from specified `event`.
   *
   *
   *  ##### See also
   *
   *  - [nodeca.io.on]
   **/
  nodeca.io.off = function off(event, handler) {
    events[event] = (!handler) ? [] : _.without(events[event], handler);
  };


  // executes all handlers registered for given `event`
  function emit(event, args) {
    _.each(events[event] || [], function (handler) {
      handler.apply(null, args);
    });
  }


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
    nodeca.io.subscribe   = _.bind(bayeux.subscribe, bayeux);
    nodeca.io.unsubscribe = _.bind(bayeux.unsubscribe, bayeux);
    nodeca.io.publish     = _.bind(bayeux.publish, bayeux);

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
    nodeca.io.rpc = function (name, params, options, callback) {
      var timeout, data = {id: RPC.last_msg_id++};

      // prepare message
      data.msg = {
        version:  nodeca.runtime.version,
        method:   name,
        params:   params
      };

      // Scenario: rpc(name, params, callback);
      if (_.isFunction(options)) {
        callback = options;
        options = {};
      }

      // store callback for the response
      RPC.callbacks[data.id] = function (msg) {
        clearTimeout(timeout);

        if (msg.version !== nodeca.runtime.version) {
          emit('rpc:version-mismatch', {
            client: nodeca.runtime.version,
            server: msg.version
          });
          return;
        }

        (callback || $.noop)(msg.err, msg.result);
      };

      // simple error handler
      function handle_error(err) {
        delete RPC.callbacks[data.id];
        (callback || $.noop)(err);
      }

      // send request
      bayeux.publish(RPC.req_channel, data)
        .errback(handle_error)
        .callback(function () {
          // set timeout to unbind callback
          timeout = setTimeout(function () {
            handle_error(new Error("Timeout."));
          }, ((options || {}).timeout || 30) * 1000);
        });
    };

    // once init complete, run scheduled methods
    _.each(['subscribe', 'unsubscribe', 'publish', 'rpc'], function (name) {
      var args;

      while (scheduled[name].length) {
        args = scheduled[name].shift();
        nodeca.io[name].apply(null, args);
      }
    });
  };
}());
