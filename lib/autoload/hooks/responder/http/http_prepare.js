// Prepare http request for server chain
// - find method (with router)
// - parse parameters
// - parse multipart post data
//
// WARNING!!! Here are NO built-in CSRF protection like in RPC.
// If you plan to enable POST requests in router, be sure to
// care about security.
//
'use strict';


const _          = require('lodash');
const Promise    = require('bluebird');
const multiparty = require('multiparty');


const MAX_FIELDS_SIZE = 100 * 1024;       // 100kb
const MAX_FILES_SIZE  = 10 * 1024 * 1024; // 10mb


module.exports = function (N) {

  //
  // Init environment for http
  //

  N.wire.before('responder:http', async function http_prepare(env) {
    var req        = env.origin.req,
        httpMethod = req.method.toLowerCase(),
        match      = env.req.matched; // N.router.match(req.fullUrl)

    env.params = (match || {}).params;

    // Nothing matched -> error
    if (!match) {
      env.err = N.io.NOT_FOUND;
      return;
    }

    // Matched route is not suitable for the request type -> error.
    if (!_.has(match.meta.methods, httpMethod)) {
      env.err = N.io.NOT_FOUND;
      return;
    }

    env.method = match.meta.methods[httpMethod];

    if (req.method !== 'POST') return;

    // Parse body for POST request

    //
    // Check request size early by header and terminate immediately for big data
    //
    let length = parseInt((req.headers['content-length'] || '0'), 10);

    if (!length || isNaN(length)) {
      env.err = N.io.LENGTH_REQUIRED;
      return;
    }

    let err = null;

    // Now we understand only multipart form requests
    if (/^multipart\/form-data(?:;|$)/i.test(req.headers['content-type'])) {

      let form = new multiparty.Form({
        maxFieldsSize: MAX_FIELDS_SIZE,
        maxFilesSize: MAX_FILES_SIZE
      });

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

      env.req.files  = files;
      env.req.fields = fields;
    }
  });
};
