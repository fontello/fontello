// Prepare http request for server chain
// - fetch POST data
// - unwrap payload (extract CSRF, method, params)


'use strict';


const Promise    = require('bluebird');
const multiparty = require('multiparty');
const getRawBody = require('raw-body');


const MAX_JSON_SIZE  = 100 * 1024;       // 100kb
const MAX_FILES_SIZE = 10 * 1024 * 1024; // 10mb


module.exports = function (N) {

  N.wire.before('responder:rpc', async function rpc_prepare(env) {
    let req = env.origin.req;
    //
    // invalid request
    //

    if (req.method !== 'POST') {
      env.err = N.io.BAD_REQUEST;
      return;
    }

    //
    // Check request size early by header and terminate immediately for big data
    //
    let length = parseInt((req.headers['content-length'] || '0'), 10);

    if (!length || isNaN(length)) {
      env.err = N.io.LENGTH_REQUIRED;
      return;
    }

    let err = null;
    let payload;

    if (/^multipart\/form-data(?:;|$)/i.test(req.headers['content-type'])) {
      let form = new multiparty.Form({ maxFieldsSize: MAX_JSON_SIZE, maxFilesSize: MAX_FILES_SIZE });

      let [ fields, files ] = await new Promise(resolve => {
        form.parse(env.origin.req, function (e, fields, files) {
          if (e) err = e;
          resolve([ fields, files ]);
        });
      });

      if (err) {
        if (err.statusCode) env.err = err.statusCode;
        else env.err = { code: N.io.BAD_REQUEST, message: err.message };
        return;
      }

      env.req.files = files;

      payload = fields.__payload__[0];
    } else {
      let data = await new Promise(resolve => {
        getRawBody(req, { encoding: true, limit: MAX_JSON_SIZE, length }, (e, data) => {
          err = e;
          resolve(data);
        });
      });

      if (err) {
        if (err.statusCode) env.err = err.statusCode;
        else env.err = { code: N.io.BAD_REQUEST, message: err.message };
        return;
      }

      payload = data;
    }

    try {
      payload = JSON.parse(payload);
    } catch (__) {
      env.err = { code: N.io.BAD_REQUEST, message: 'Cannot parse post data' };
      return;
    }

    env.params = payload.params || {};

    // mark files as "uploaded" for validation purposes
    // (just consistency check, doesn't prevent users from setting empty string)
    Object.keys(env.req.files).forEach(field => {
      env.params[field] = '';
    });

    // save CSRF token if it was sent
    req.csrf = payload.csrf;

    // invalid payload
    if (!payload.assets_hash || !payload.method) {
      env.err = N.io.BAD_REQUEST;
      return;
    }

    env.method = payload.method;

    // invalid client version.
    // client will check server version by it's own,
    // so in fact this error is not used by client
    if (payload.assets_hash !== N.assets_hash) {
      env.err = { code: N.io.BAD_REQUEST, message: 'Client version outdated' };
      return;
    }
  });

};
