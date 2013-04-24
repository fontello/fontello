/**
 *  io
 *
 *  This module provides realtime communication methods for Nlib based
 *  applications.
 **/


'use strict';


// last xhr to allow interrupt it
var last_xhr = null;


// utilities
function isFunction(object) {
  return '[object Function]' === Object.prototype.toString.call(object);
}


// IO status/error codes used by RPC and HTTP servers
exports.ECOMMUNICATION      = 1;
exports.EWRONGVER           = 2;
exports.OK                  = 200;
exports.REDIRECT            = 302;
exports.NOT_MODIFIED        = 304;
exports.BAD_REQUEST         = 400;
exports.NOT_AUTHORIZED      = 401;
exports.NOT_FOUND           = 404;
exports.APP_ERROR           = 500;
exports.INVALID_CSRF_TOKEN  = 450;


// error constructor
function error(code, message) {
  var err = new Error(message);
  err.code = code;
  return err;
}


/**
 *  rpc(name, params, options, callback) -> Void
 *  rpc(name, params[, callback]) -> Void
 *  rpc(name, callback) -> Void
 **/
function rpc(name, params, options, callback) {
  var xhr, payload;

  payload = {
    version:  N.runtime.version,
    method:   name,
    csrf:     N.runtime.csrf
  };

  // Scenario: rpc(name, callback);
  if (isFunction(params)) {
    callback = params;
    params   = options  = {};
  }

  // Scenario: rpc(name, params[, callback]);
  if (isFunction(options)) {
    callback = options;
    options = {};
  }

  // fill in defaults
  options   = options || {_retryOnCsrfError: true};
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

  N.wire.emit('io.request');

  xhr = last_xhr = $.post('/io/rpc', JSON.stringify(payload));

  //
  // Listen for a response
  //

  xhr.success(function (data) {
    data = data || {};

    if (data.version !== N.runtime.version) {
      data.error = error(exports.EWRONGVER, 'Client version does not match server.');
      delete data.response;
    }

    // if invalid CSRF token error and retry is allowed
    if (data.error && exports.INVALID_CSRF_TOKEN === data.error.code && options._retryOnCsrfError) {
      // renew CSRF token
      N.runtime.csrf = error.data.token;

      // only one attempt to retry is allowed
      options._retryOnCsrfError = false;

      // try again
      rpc(name, params, options, callback);
      return;
    }

    if (data.error) {
      N.wire.emit('io.error', data.error);
    }

    N.wire.emit('io.complete', {
      error:    data.error
    , response: data.response
    });

    // run actual callback
    callback(data.error, data.response);
  });

  //
  // Listen for an error
  //

  xhr.fail(function (jqXHR, status) {
    var err;

    // for possible status values see: http://api.jquery.com/jQuery.ajax/

    if ('abort' === status) {
      return;
    }

    N.logger.error('Failed RPC call: ' + status, jqXHR);

    // any non-abort error - is communication problem
    err = error(exports.ECOMMUNICATION, 'Communication error');

    N.wire.emit('io.error', err);
    N.wire.emit('io.complete');

    callback(err);
  });
}


exports.rpc = rpc;
