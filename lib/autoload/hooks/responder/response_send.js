// Send reply to client.
// We expect, to have:
// - env.res
//   - body
//   - headers


'use strict';


const http        = require('http');
const _           = require('lodash');
const compression = require('compression')();
const isFinished  = require('on-finished').isFinished;


var valid_headers = {};
[ // http://en.wikipedia.org/wiki/List_of_HTTP_header_fields
  'Access-Control-Allow-Origin',
  'Accept-Ranges',
  'Age',
  'Allow',
  'Cache-Control',
  'Connection',
  'Content-Encoding',
  'Content-Language',
  'Content-Length',
  'Content-Location',
  'Content-MD5',
  'Content-Disposition',
  'Content-Security-Policy',
  'Content-Security-Policy-Report-Only',
  'Content-Range',
  'Content-Type',
  'Date',
  'ETag',
  'Expires',
  'Last-Modified',
  'Link',
  'Location',
  'P3P',
  'Pragma',
  'Proxy-Authenticate',
  'Refresh',
  'Retry-After',
  'Server',
  'Set-Cookie',
  'Strict-Transport-Security',
  'Trailer',
  'Transfer-Encoding',
  'Vary',
  'Via',
  'Warning',
  'WWW-Authenticate',
  // Common non-standard response headers
  'X-Frame-Options',
  'X-XSS-Protection',
  'X-Content-Security-Policy',
  'X-WebKit-CSP',
  'X-Content-Type-Options',
  'X-Powered-By',
  'X-UA-Compatible'
].forEach(hdr => { valid_headers[hdr] = true; });


////////////////////////////////////////////////////////////////////////////////

// Note, we also listen `responder:bin` to unify logging & error responding

const CHANNELS = [ 'responder:http', 'responder:rpc', 'responder:bin' ];

module.exports = function (N) {

  N.wire.after(CHANNELS, { priority: 100 }, function response_compress(env, callback) {
    compression(env.origin.req, env.origin.res, callback);
  });

  N.wire.after(CHANNELS, { priority: 100 }, function response_send(env) {
    var res = env.origin.res,
        headers = env.headers,
        body = env.body,
        statusCode;

    // If someone already sent reply - do nothing
    if (isFinished(res)) return;

    // That should not happen, because custom senders should wait
    // stream end.
    if (res.headerSent) return;

    //
    // Set some obligatory headers
    //

    headers.Server = headers.Server || 'Sansun Calakci';
    // added by node automatically
    // headers['Date'] = headers['Date'] || new Date).toUTCString();

    //
    // Remove Accept-Ranges if it wasn't explicitly set
    //

    if (!headers['Accept-Ranges']) {
      res.removeHeader('Accept-Ranges');
    }

    //
    // set headers
    //

    _.forEach(headers, (value, name) => {
      // Check if header registered, since
      // one can mistype capitalization and name
      if (!valid_headers[name]) {
        N.logger.fatal('send_reply: Got wrong header %s in method %s', name, env.method);
      }

      if (value === null) {
        res.removeHeader(name);
        return;
      }
      res.setHeader(name, value);
    });


    //
    // should not happen
    //

    if (!res.getHeader('Content-Type')) {
      N.logger.fatal('send_reply: Required header Content-Type was not set in %s', env.method);
    }

    //
    // When body is given, it MUST be a Buffer or a String
    // (this error should not happen)
    //

    if (body && !Buffer.isBuffer(body) && typeof body !== 'string') {
      statusCode = N.io.APP_ERROR;
      body       = http.STATUS_CODES[statusCode];
      N.logger.fatal('send_reply: body MUST be a Buffer, String or Null/Undefined. in %s',
                     env.method);
    }

    // set status code and send body (if any)
    res.statusCode = env.status;
    res.end(body);
  });
};
