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
  // Params: an arbitrary JSON object, File or Blob entries are allowed on top
  // level of said object (serialized into json without files or multipart form
  // with files).
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

    let files = [];
    let xhr;
    let contentType;
    let formData;

    let data = JSON.stringify({
      assets_hash: N.runtime.assets_hash,
      method: name,
      csrf: document.cookie.replace(/(?:(?:^|.*;\s*)csrf-token\s*\=\s*([^;]*).*$)|^.*$/, '$1'),
      params
    }, function find_files(key, value) {
      // assume that File is inherited from Blob
      if (value instanceof Blob) {
        files.push({ key, value });

        /* eslint-disable no-undefined */
        return undefined;
      }

      return value;
    });

    if (files.length) {
      formData = new FormData();
      formData.append('__payload__', data);
      files.forEach(file => formData.append(file.key, file.value));
      contentType = false; // will be auto-set to "multipart/form-data; boundary=..."
    } else {
      formData = data;
      contentType = 'application/json';
    }

    xhr = $.ajax({
      url: '/io/rpc',
      type: 'POST',
      data: formData,
      dataType: 'json',
      contentType,
      // turn off replacing encoded spaces like '%20' with '+', see
      // https://github.com/jquery/jquery/issues/2658
      processData: false,
      xhr() {
        let xhr = $.ajaxSettings.xhr();

        if (options.onProgress) {
          if (xhr.upload) {
            xhr.upload.addEventListener('progress', options.onProgress);
          }
        }

        return xhr;
      }
    });

    if (!options.persistent) {
      requests.push(xhr);
    }

    let p = Promise.resolve(xhr).then(data => {
      requests = _.without(requests, xhr);

      data = data || {};

      if (data.assets_hash !== N.runtime.assets_hash) {
        data.error = {
          code: codes.EWRONGVER,
          hash: data.assets_hash,
          message: 'Server software was updated. Please reload your page to continue.'
        };
        delete data.res;
      }

      // If invalid CSRF token error and retry is allowed.
      if (data.error && codes.INVALID_CSRF_TOKEN === data.error.code && options._retryOnCsrfError) {
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
