// Send reply to client.
// We expect, to have:
// - env.res
//   - body
//   - headers
//   - log


'use strict';


var http = require('http');
var _    = require('lodash');


var valid_headers = {};
[ //http://en.wikipedia.org/wiki/List_of_HTTP_header_fields
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
].forEach(function (hdr) { valid_headers[hdr] = true; });


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {

  N.wire.after(['responder:http', 'responder:rpc'], { priority: 100 }, function response_send(env) {
    var res = env.origin.res
      , headers = env.headers
      , body = env.body
      , statusCode;

    //
    // Set some obligatory headers
    //

    headers['Server'] = headers['Server'] || 'Sansun Calakci';
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

    _.each(headers, function (value, name) {
      // Check if header registered, since
      // one can mistype capitalization and name
      if (!valid_headers[name]) {
        N.logger.fatal("send_reply: Got wrong header %s in method %s", name, env.method);
      }

      if (null === value) {
        this.removeHeader(name);
        return;
      }
      this.setHeader(name, value);
    }, res);


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

    if (body && !Buffer.isBuffer(body) && 'string' !== typeof body) {
      statusCode = N.io.APP_ERROR;
      body = http.STATUS_CODES[statusCode];
      N.logger.fatal('send_reply: body MUST be a Buffer, String or Null/Undefined. in %s',
                     env.method);
    }

    // FIXME: Do not forget to filter-out sensitive params upon logging
    // if (req.params.password) req.params.password = '***';
    // if (req.params.password_confirmation) req.params.password_confirmation = '***';

    env.log_request(env);

    //
    // Set Content-Length header if body is given.
    // body is always Buffer, String or Null|Undefined.
    //

    if (Buffer.isBuffer(body)) {
      headers['Content-Length'] = body.length;
    } else if (body) {
      // NOTE: Buffer.byteLength() throws TypeError when argument is not a String.
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    // set status code and send body (if any)
    res.statusCode = env.status;
    res.end(body);
  });
};

