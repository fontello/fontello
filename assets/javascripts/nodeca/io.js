/**
 *  nodeca.io
 *
 *  This module provides realtime communication methods for nodeca/nlib based
 *  applications.
 **/


//= depend_on nodeca


/*global window, $, _, Faye, nodeca*/


(function () {
  'use strict';


  var // registered events
      events = {},
      // last xhr to allow interrupt it
      last_xhr = null;


  // exported IO object
  var io = nodeca.io = {};


  //
  // Errors
  //


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
    args = _.isArray(args) ? args : []; // for IE < 9
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
   *  - `connected`
   *  - `disconnected`
   *  - `rpc:version-mismatch({ client: "str", server: "str" })`
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


  /**
   *  nodeca.io.apiTree(name, params, options, callback) -> Void
   *  nodeca.io.apiTree(name, params[, callback]) -> Void
   *  nodeca.io.apiTree(name, callback) -> Void
   **/
  io.apiTree = function apiTree(name, params, options, callback) {
    var xhr, payload = { version: nodeca.runtime.version, method: name };

    // Scenario: apiTree(name, callback);
    if (_.isFunction(params)) {
      callback = params;
      params   = options  = {};
    }

    // Scenario: apiTree(name, params[, callback]);
    if (_.isFunction(options)) {
      callback = options;
      options = {};
    }

    // fill in defaults
    options   = options || {};
    callback  = callback || $.noop;

    //
    // Interrupt previous rpc request
    //

    if (last_xhr) {
      (last_xhr.reject || $.noop)();
      last_xhr = null;
    }

    // fill in payload params
    payload.params = params;

    //
    // Send request
    //

    nodeca.logger.debug('API3 Sending request', payload);
    xhr = last_xhr = $.post('/rpc', payload);

    //
    // Listen for a response
    //

    xhr.success(function (data) {
      data = data || {};

      nodeca.logger.debug('API3 Received data', data);

      if (data.version !== nodeca.runtime.version) {
        // emit version mismatch error
        emit('rpc:version-mismatch', {
          client: nodeca.runtime.version,
          server: data.version
        });

        callback(ioerr(io.EWRONGVER, 'Client version does not match server.'));
        return;
      }

      // run actual callback
      callback(data.error, data.response);
    });

    //
    // Listen for an error
    //

    xhr.fail(function (err) {
      if (err) {
        // fire callback with error only in case of real error
        // and not due to our "previous request interruption"
        // TODO: Handle this error separately - it's a real fuckup
        callback(err);
      }
    });
  };
}());
