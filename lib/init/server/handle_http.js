// HTTP requests handler


"use strict";


/*global underscore, N*/
/*jshint maxparams:8*/


// stdlib
var http = require('http');


// 3rd-party
var _ = underscore;


// internal
var env         = require('../../env');
var compression = require('./compression');


////////////////////////////////////////////////////////////////////////////////


function log(req, res, code, env, err) {
  var // FIXME: env might not be yet defined (when router didn't matched)
      logger  = N.logger.getLogger(env ? ('server.' + env.request.method) : 'server'),
      message = http.STATUS_CODES[code], level;

  if (err || (N.io.APP_ERROR <= code)) {
    message = err ? (err.stack || err.message || err) : message;
    level   = 'fatal';
  } else if (N.io.BAD_REQUEST <= code && N.io.APP_ERROR > code) {
    level = 'error';
  } else {
    level = 'info';
  }

  // FIXME: Do not forget to filter-out sensitive params upon logging
  // if (req.params.password) req.params.password = '***';
  // if (req.params.password_confirmation) req.params.password_confirmation = '***';

  logger[level]('%s - "%s %s HTTP/%s" %d "%s" - %s',
                req.connection.remoteAddress,
                req.method,
                req.url,
                req.httpVersion,
                code,
                req.headers['user-agent'],
                message);
}

// Ends response with given `code`, `head`ers and `body`.
// Rejects body if request method was HEAD
//
function end(req, res, code, head, body, env, err) {
  // set headers
  _.each(head || {}, function (value, name) {
    if (null === value) {
      this.removeHeader(name);
      return;
    }

    this.setHeader(name, value);
  }, res);

  // Remove Accept-Ranges if it wasn't explicitly set
  if (!(head || {})['Accept-Ranges']) {
    res.removeHeader('Accept-Ranges');
  }

  if ('HEAD' === req.method) {
    // remove body, when it's not supposed to be sent
    body = null;
  } else if (!body) {
    // auto-set body based on status code
    body = http.STATUS_CODES[code];
  }

  if (!res.getHeader('Content-Type')) {
    N.logger.warn('Required header Content-Type was not set in ' +
                       env.request.method);
  }

  //
  // Set some obligatory headers
  //

  res.setHeader('Server', 'Sansung Calakci');
  res.setHeader('Date',   (new Date).toUTCString());

  //
  // When body is given, it MUST be a Buffer or a String
  //

  if (body && !Buffer.isBuffer(body) && 'string' !== typeof body) {
    code = 500;
    body = http.STATUS_CODES[500];
    err  = new Error("end(): body MUST be a Buffer, String or Null/Undefined.");
  }

  //
  // Log request
  //

  log(req, res, code, env, err);

  //
  // Set Content-Length header if body is given.
  // body is always Buffer, String or Null|Undefined.
  //

  if (Buffer.isBuffer(body)) {
    res.setHeader('Content-Length', body.length);
  } else if (body) {
    // NOTE: Buffer.byteLength() throws TypeError when argument is not a String.
    res.setHeader('Content-Length', Buffer.byteLength(body));
  }

  // set status code and send body (if any)
  res.statusCode = code;
  res.end(body);
}


////////////////////////////////////////////////////////////////////////////////


// Handles errors.
//
function process_error(req, res, err, env) {
  var body;

  // Scenario: next(404);
  if (err === +err) {
    err = { code: err };
  }

  //
  // user asks for request termination providing:
  //
  //    - code  (Number)
  //    - head  (Object)  Optional
  //    - data  (Mixed)   Optional
  //

  if (err.code) {
    err.head = _.defaults(err.head || {}, {
      'Content-Type': 'text/plain; charset=utf-8'
    });

    if (err.data && 'object' === typeof err.data) {
      err.data = JSON.stringify(err.data);
    }

    end(req, res, err.code, err.head, err.data, env);
    return;
  }

  //
  // exceptions or fatal fuckup happened
  //

  body = ('development' !== N.runtime.env) ? 'Application error'
       : (err.stack || err.toString());
  end(req, res, N.io.APP_ERROR, {'Content-Type': 'text/plain; charset=utf-8'}, body, env, err);
}


// Final callback of the Hooker#run
//
function finalize(err) {
  var env, http, resp, type, compressor;

  /*jshint validthis:true*/

  if (err) {
    process_error(this.origin.http.req, this.origin.http.res, err, this);
    return;
  }

  //
  // Shorten some vars
  //

  env  = this;
  http = this.origin.http;
  resp = this.response;

  //
  // Check whenever compression is allowed by client or not
  //

  type = resp.headers['Content-Type'] || http.res.getHeader('Content-Type');
  compressor = /json|text|javascript/.test(type) && compression.is_allowed(http.req);

  //
  // Mark for proxies, that we can return different content (plain & gzipped),
  // depending on specified (comma-separated) headers
  //

  resp.headers['Vary'] = 'Accept-Encoding';

  //
  // Return raw response, if compression is not allowed or body is too small
  //

  if (false === compressor || 500 > Buffer.byteLength(resp.body || '')) {
    end(http.req, http.res, resp.statusCode || N.io.OK, resp.headers, resp.body, env);
    return;
  }

  //
  // Compression is allowed, set Content-Encoding
  //

  resp.headers['Content-Encoding'] = compressor;

  //
  // Compress body
  //

  compression.process(compressor, resp.body, function (err, buffer) {
    if (err) {
      process_error(http.req, http.res, err, env);
      return;
    }

    end(http.req, http.res, resp.statusCode || N.io.OK, resp.headers, buffer, env);
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function handle_http(req, res) {
  var match = N.runtime.router.match(req.fullUrl),
      // mix GET QUERY params (part after ? in URL) and params from router
      // params from router take precedence
      params = _.extend({}, req.query, (match || {}).params),
      func, validation;

  // Save params reference for logs
  req.params = params;

  if (!match) {
    // Route not found
    process_error(req, res, { code: N.io.NOT_FOUND });
    return;
  }

  validation = N.validate.test(match.meta, params);

  // when method has no validation schema,
  // test() returns `null`, object with `valid` property otherwise
  if (!validation) {
    process_error(req, res, "Params schema is missing for " + match.meta);
    return;
  }

  if (!validation.valid) {
    // FIXME: do not list "bad" params on production?
    process_error(req, res, {
      code: N.io.BAD_REQUEST,
      message: "Invalid params:\n" + validation.errors.map(function (err) {
        return "- " + err.property + ' ' + err.message;
      }).join('\n')
    });
    return;
  }

  func = N.server[match.meta];

  N.filters.run(match.meta, params, func, finalize, env({
    http:   { req: req, res: res },
    method: match.meta
  }));
};
