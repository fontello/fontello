/**
 *  io
 *
 *  This module provides realtime communication methods for Nodeca.
 **/
'use strict';


const _     = require('lodash');
// IO status/error codes used by RPC and HTTP servers.
const codes = require('../../io');


module.exports = function (N) {
  let requests = [];


  // Define custom error classes
  //
  function RPCError() {
  }

  RPCError.prototype = Object.create(Error.prototype);


  // rpc(name, [params], [options]) -> Promise
  //
  // Returned promise extended with `.cancel()` that allow abort XHR request.
  //
  // Options:
  //
  // - persistent - optional, do not terminate request by `navigate.exit`, default `false`
  //
  // Example:
  //
  //   rpc('core.test')
  //     .then(response => { /*...*/ })
  //     .catch(err => {
  //       if (err.code !== N.io.CLIENT_ERROR) throw err;
  //       /*...*/
  //     });
  //
  function rpc(name, params, options) {
    // Fill in defaults
    options = _.defaults({}, options, {
      _retryOnCsrfError: true,
      persistent: false
    });

    if (!options._retryOnCsrfError) {
      // Start progress notice timer.
      N.wire.emit('io.request');
    }

    let xhr = $.post('/io/rpc', JSON.stringify({
      version_hash: N.version_hash,
      method: name,
      csrf: N.runtime.token_csrf,
      params
    }));

    if (!options.persistent) {
      requests.push(xhr);
    }

    let p = Promise.resolve(xhr).then(data => {
      requests = _.without(requests, xhr);

      data = data || {};

      if (data.version_hash !== N.version_hash) {
        data.error = {
          code: codes.EWRONGVER,
          message: 'Server software was updated. Please reload your page to continue.'
        };
        delete data.res;
      }

      // If invalid CSRF token error and retry is allowed.
      if (data.error && codes.INVALID_CSRF_TOKEN === data.error.code && options._retryOnCsrfError) {
        // Renew CSRF token.
        N.runtime.token_csrf = data.error.data.token;

        // Only one attempt to retry is allowed.
        options._retryOnCsrfError = false;

        // Try again.
        return rpc(name, params, options);
      }

      if (data.error) {
        let error = new RPCError();

        _.assign(error, data.error);
        N.wire.emit('io.complete', { error, res: null });
        throw error;
      }

      N.wire.emit('io.complete', { error: null, res: data.res });
      return data.res;
    }).catch(err => {
      if (err instanceof RPCError) {
        throw err;
      }

      let error;

      requests = _.without(requests, xhr);

      // For possible status values see: http://api.jquery.com/jQuery.ajax/
      if (err.statusText === 'abort') {
        error = 'CANCELED';
      } else {
        error = new RPCError();
        error.code = codes.ECOMMUNICATION;
      }

      N.wire.emit('io.complete', { error, res: null });
      throw error;
    });

    // Extend returned promise with abort handler.
    p.cancel = xhr.abort.bind(xhr);

    return p;
  }


  // Terminate non-persistent running rpc requests on page exit
  //
  N.wire.after('navigate.exit', function terminate_rpc_requests() {
    requests.forEach(function (xhr) {
      xhr.abort();
    });
  });


  return _.assign({}, codes, {
    rpc,
    RPCError
  });
};
