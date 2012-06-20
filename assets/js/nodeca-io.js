/**
 *  nodeca.io
 *
 *  This module provides realtime communication methods for nodeca/nlib based
 *  applications.
 **/


//= depend_on nodeca
//= require faye-browser


/*global window, $, _, Faye, nodeca*/


(function () {
  'use strict';


  var // registered events
      events = {},
      // underlying bayeux client
      bayeux = null,
      // whenever transport is up or not
      is_connected = false,
      // api3 related (used by apiTree() send/receive calls) properies
      api3 = {
        req_channel: '/x/api3-req/' + window.REALTIME_ID,
        res_channel: '/x/api3-res/' + window.REALTIME_ID,
        callbacks:    {},
        last_msg_id:  0
      };


  // exported IO object
  var io = nodeca.io = {};


  //
  // Errors
  //


  io.ENOCONN    = 'IO_ENOCONN';
  io.ETIMEOUT   = 'IO_ETIMEOUT';
  io.EWRONGVER  = 'IO_EWRONGVER';


  // error constructor
  function ioerr(code, message) {
    var err = new Error(message);
    err.code = code;
    return err;
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
   **/
  io.on = function on(event, handler) {
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
  io.off = function off(event, handler) {
    events[event] = (!handler) ? [] : _.without(events[event], handler);
  };


  //
  // Main API
  //


  function bayeux_call(name, args) {
    var result = bayeux[name].apply(bayeux, args);

    //
    // provide jQuery.Defered style methods
    //

    // FAYE DOCUMENTATION:
    //
    //  Bear in mind that ‘success’ here just means the server received and
    //  routed the message successfully, not that it has been received by all
    //  other clients.
    result.done = _.bind(function (fn) { this.callback(fn); return this; }, result);

    // FAYE DOCUMENTATION:
    //
    //  An error means the server found a problem processing the message.
    //  Network errors are not covered by this.
    result.fail = _.bind(function (fn) { this.errback(fn); return this; }, result);

    return result;
  }


  /**
   *  nodeca.io.subscribe(channel, handler) -> Object
   **/
  io.subscribe = function subscribe(channel, handler) {
    return bayeux_call('subscribe', [channel, handler]);
  };


  /**
   *  nodeca.io.unsubscribe(channel[, handler]) -> Object
   **/
  io.unsubscribe = function unsubscribe(channel, handler) {
    return bayeux_call('unsubscribe', [channel, handler]);
  };


  /**
   *  nodeca.io.publish(channel, message) -> Object
   **/
  io.publish = function publish(channel, message) {
    return bayeux_call('publish', [channel, message]);
  };


  /**
   *  nodeca.io.apiTree(name, params, options, callback) -> Void
   *  nodeca.io.apiTree(name, params[, callback]) -> Void
   *  nodeca.io.apiTree(name, callback) -> Void
   **/
  io.apiTree = function apiTree(name, params, options, callback) {
    var timeout, id = api3.last_msg_id++, data = {id: id};

    // Scenario: rpc(name, callback);
    if (_.isFunction(params)) {
      callback = params;
      params   = options  = {};
    }

    // Scenario: rpc(name, params[, callback]);
    if (_.isFunction(options)) {
      callback = options;
      options = {};
    }

    // fill in defaults
    options   = options || {};
    callback  = callback || $.noop;

    //
    // ERROR HANDLING
    //
    // - when there's no connection (or client is `connecting`), we execute
    //   callback with `ENOCONN` error imediately
    // - when connection lost during waiting for server to send a message into
    //   response channel, we execute calback with `ECONNGONE` error
    // - when server didn't received published request message within 30 seconds
    //   we execute callback with `ETIMEOUT` error
    //

    // check if there an active connection
    if (!is_connected) {
      callback(ioerr(io.ENOCONN, 'No connection to the server (RT).'));
      return;
    }

    // fill in message
    data.msg = {
      version:  nodeca.runtime.version,
      method:   name,
      params:   params
    };

    // stop timer
    function stop_timer() {
      clearTimeout(timeout); // stop timeout counter
      timeout = null; // mark timeout as "removed"
    }

    // simple error handler
    function handle_error(err) {
      stop_timer();
      delete api3.callbacks[id];
      callback(err);
    }

    // handle transport down during request error
    function handle_transport_down() {
      // mimics `once()` event listener
      bayeux.unbind('transport:down', handle_transport_down);
      handle_error(ioerr(io.ECONNGONE, 'Server gone. (RT)'));
    }

    bayeux.bind('transport:down', handle_transport_down);

    // store callback for the response
    api3.callbacks[id] = function (msg) {
      stop_timer();

      bayeux.unbind('transport:down', handle_transport_down);

      if (msg.version !== nodeca.runtime.version) {
        // emit version mismatch error
        emit('api3:version-mismatch', {
          client: nodeca.runtime.version,
          server: msg.version
        });
        callback(ioerr(io.EWRONGVER, 'Client version does not match server.'));
        return;
      }

      // run actual callback
      callback(msg.err, msg.result);
    };

    // wait for successfull message delivery 10 seconds
    timeout = setTimeout(function () {
      handle_error(ioerr(io.ETIMEOUT, 'Timeout ' + name + ' execution.'));
    }, 10000);


    // send request
    bayeux_call('publish', [api3.req_channel, data])
      // see bayeux_call info for details on fail/done
      .fail(handle_error)
      .done(stop_timer);
  };


  //
  // Initialization API
  //


  /**
   *  nodeca.io.auth(callback) -> Void
   **/
  io.auth = function (callback) {
    // Not implemented yet
    callback(null);
  };


  // responses listener
  function handle_api3_response(data) {
    var callback = api3.callbacks[data.id];

    if (!callback) {
      // unknown response id
      return;
    }

    delete api3.callbacks[data.id];
    callback(data.msg);
  }


  /**
   *  nodeca.io.init() -> Void
   **/
  io.init = function () {
    bayeux = new Faye.Client('/faye');

    if ('development' === nodeca.runtime.env) {
      // export some internals for debugging
      window.fontello_bayeux = bayeux;
    }

    //
    // once connected, client.getState() always returns 'CONNECTED' regardless
    // to the real state, so instead of relying on this state we use our own
    //

    bayeux.bind('transport:up',   function () {
      is_connected = true;
      emit('connected');
    });

    bayeux.bind('transport:down', function () {
      is_connected = false;
      emit('disconnected');
    });

    //
    // faye handles reconnection on it's own:
    // https://groups.google.com/d/msg/faye-users/NJPd3v98zjY/hyGpoat5Of0J
    //

    bayeux.subscribe(api3.res_channel, handle_api3_response);
  };
}());
