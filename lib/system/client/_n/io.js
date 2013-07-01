/**
 *  io
 *
 *  This module provides realtime communication methods for Nodeca.
 **/


'use strict';


var _ = require('lodash');


// Last XMLHttpRequest object used for RPC request to allow interrupt it.
//var __lastRPCRequest__ = null;


// IO status/error codes used by RPC and HTTP servers.
_.extend(exports, require('../../io'));


// Checks for a non-system error which should be passed to the callback.
//
function isNormalCode(code) {
  return 200 <= code && code <= 299      ||
         300 <= code && code <= 399      ||
         exports.NOT_AUTHORIZED === code ||
         exports.NOT_FOUND      === code ||
         exports.CLIENT_ERROR   === code;
}


// Checks for a system-level error which should *NOT* be passed to the callback.
// These errors are emitted to 'io.error' Wire channel.
//
function isErrorCode(code) {
  return !isNormalCode(code);
}


/**
 *  rpc(name, params, options, callback) -> Void
 *  rpc(name, params[, callback]) -> Void
 *  rpc(name, callback) -> Void
 **/
function rpc(name, params, options, callback) {
  var xhr;

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
  options   = options || {_retryOnCsrfError: true};
  callback  = callback || $.noop;

  // Interrupt previous RPC request.
  //if (__lastRPCRequest__) {
  //  (__lastRPCRequest__.reject || $.noop)();
  //  __lastRPCRequest__ = null;
  //}

  // Send request
  N.wire.emit('io.request');

  xhr = /*__lastRPCRequest__ =*/ $.post('/io/rpc', JSON.stringify({
    version: N.runtime.version
  , method:  name
  , csrf:    N.runtime.csrf
  , params:  params
  }));

  // Listen for a response.
  xhr.success(function (data) {
    data = data || {};

    if (data.version !== N.runtime.version) {
      data.error = {
        code:    exports.EWRONGVER
      , message: 'Client version does not match server.'
      };
      delete data.response;
    }

    // If invalid CSRF token error and retry is allowed.
    if (data.error && exports.INVALID_CSRF_TOKEN === data.error.code && options._retryOnCsrfError) {
      // Renew CSRF token.
      N.runtime.csrf = data.error.data.token;

      // Only one attempt to retry is allowed.
      options._retryOnCsrfError = false;

      // Try again.
      rpc(name, params, options, callback);
      return;
    }

    if (data.error && isErrorCode(data.error.code)) {
      N.wire.emit('io.error', data.error);
    }

    N.wire.emit('io.complete', { error: data.error, response: data.response });

    // Run actual callback only when no error happen or it's a non-system error.
    if (!data.error || isNormalCode(data.error.code)) {
      if (false === callback(data.error, data.response)) {
        // We use 'false' to determine that the callback wants use default error
        // handling procedure.
        if (data.error) {
          N.wire.emit('io.error', data.error);
        }
      }
    }
  });

  // Listen for an error.
  xhr.fail(function (jqXHR, status) {
    var err;

    // For possible status values see: http://api.jquery.com/jQuery.ajax/
    if ('abort' === status) {
      return;
    }

    N.logger.error('Failed RPC call: %s', status, jqXHR);

    // Any non-abort error - is a communication problem.
    err = { code: exports.ECOMMUNICATION };

    N.wire.emit('io.error', err);
    N.wire.emit('io.complete', { error: err, response: null });
  });
}


exports.rpc = rpc;
