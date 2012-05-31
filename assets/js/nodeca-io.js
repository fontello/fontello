/**
 *  nodeca.io
 *
 *  This module provides realtime communication methods for nodeca/nlib based
 *  applications.
 **/


/*global window, $, _, Faye, nodeca*/


//= depend_on nodeca
//= require faye-browser


(function () {
  'use strict';


  var // cache of scheduled calls, that will be
      // run once `nodeca.io.init()` called
      scheduled = [],
      // registered events
      events = {},
      // underlying bayeux client
      bayeux = null,
      api3 = {
        req_channel: '/x/api3-req/' + window.REALTIME_ID,
        res_channel: '/x/api3-res/' + window.REALTIME_ID,
        callbacks:    {},
        last_msg_id:  0
      };


  // exported IO object
  nodeca.io = {};


  //
  // Delayed calls scheduler
  //


  function schedule_call(func, args, deferred) {
    scheduled.push(func, args, deferred);
  }


  function run_scheduled_calls() {
    var parts, result;

    while (scheduled.length) {
      parts  = scheduled.shift();
      result = parts[0].apply(null, parts[1]);

      // proxy-pass deferred
      if (parts[2]) {
        result.done(parts[2].resolve);
        result.fail(parts[2].reject);
      }
    }
  }

  //
  // Events
  //


  // executes all handlers registered for given `event`
  function emit(event, args) {
    _.each(events[event] || [], function (handler) {
      handler.apply(null, args);
    });
  }


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
   *  - `api3:version-mismatch(versions)`
   *  - `init:auth-error(err)`
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


  //
  // Internal handlers
  //


  function api3_response_handler(data) {
    var callback = api3.callbacks[data.id];

    if (!callback) {
      // unknown response id
      return;
    }

    delete api3.callbacks[data.id];
    callback(data.msg);
  }

  function api3_send_request(name, params, options, callback) {
    var timeout, id = api3.last_msg_id++, data = {id: id};

    // fill in message
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

    // fill in defaults
    options   = _.extend({timeout: 30}, options);
    callback  = callback || $.noop;

    // store callback for the response
    api3.callbacks[id] = function (msg) {
      clearTimeout(timeout); // stop timeout counter
      timeout = null; // mark timeout as "removed"

      if (msg.version !== nodeca.runtime.version) {
        // emit version mismatch error
        emit('api3:version-mismatch', {
          client: nodeca.runtime.version,
          server: msg.version
        });
        return;
      }

      // run actual callback
      callback(msg.err, msg.result);
    };

    // simple error handler
    function handle_error(err) {
      delete api3.callbacks[id];
      callback(err);
    }

    // send request
    bayeux.publish(api3.req_channel, data)
      .errback(handle_error)
      .callback(function () {
        if (undefined !== timeout) {
          // response fired before we received
          // confirmation of request delivery
          return;
        }

        // schedule timeout error
        timeout = setTimeout(function () {
          handle_error(new Error("Timeout."));
        }, (options.timeout || 30) * 1000);
      });
  }


  //
  // Main API
  //


  function bayeux_call(name, args) {
    var deferred = $.Deferred();

    if (bayeux) {
      bayeux[name].apply(bayeux, args)
        .callback(deferred.resolve)
        .errback(deferred.reject);
    } else {
      schedule_call(bayeux_call, arguments, deferred);
    }

    return {done: deferred.done, fail: deferred.fail};
  }


  /**
   *  nodeca.io.subscribe(channel, handler) -> Object
   **/
  nodeca.io.subscribe = function subscribe(channel, handler) {
    return bayeux_call('subscribe', [channel, handler]);
  };


  /**
   *  nodeca.io.unsubscribe(channel[, handler]) -> Object
   **/
  nodeca.io.unsubscribe = function unsubscribe(channel, handler) {
    return bayeux_call('unsubscribe', [channel, handler]);
  };


  /**
   *  nodeca.io.publish(channel, message) -> Object
   **/
  nodeca.io.publish = function publish(channel, message) {
    return bayeux_call('publish', [channel, message]);
  };


  /**
   *  nodeca.io.apiTree(name, params[, options][, callback]) -> Void
   **/
  nodeca.io.apiTree = function apiTree(name, params, options, callback) {
    if (bayeux) {
      api3_send_request.apply(null, arguments);
    } else {
      schedule_call(api3_send_request, arguments);
    }
  };


  //
  // Initialization API
  //


  /**
   *  nodeca.io.auth(callback) -> Void
   **/
  nodeca.io.auth = function (callback) {
    // Not implemented yet
    callback(null);
  };


  /**
   *  nodeca.io.init() -> Void
   **/
  nodeca.io.init = function () {
    nodeca.io.auth(function (err) {
      if (err) {
        emit('init:auth-error', err);
        return;
      }

      bayeux = new Faye.Client('/faye');
      bayeux.subscribe(api3.res_channel, api3_response_handler);
      run_scheduled_calls();
    });
  };
}());
