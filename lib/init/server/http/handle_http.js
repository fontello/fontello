"use strict";


/*global nodeca, _*/


// stdlib
var http = require('http');


// internal
var env         = require('../../../env');
var compression = require('./compression');


// nodeca
var HashTree = require('nlib').Support.HashTree;


////////////////////////////////////////////////////////////////////////////////


function log(req, res, code, env, err) {
  var // FIXME: env might not be yet defined (when router didn't matched)
      logger  = nodeca.logger.getLogger(env ? ('server.' + env.request.method) : 'server'),
      level   = (err && 'error') || (400 <= code && 'warn') || 'info',
      message = (err && err.stack) || (err && err.message) || err || http.STATUS_CODES[code];

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
    nodeca.logger.error('Required header Content-Type was not set in ' +
                        env.request.method);
  }

  //
  // Set some obligatory headers
  //

  res.setHeader('Server', 'Sansung Calakci');
  res.setHeader('Date',   (new Date).toUTCString());

  log(req, res, code, env, err);

  //
  // We don't give a shit about Content-Length as Node.JS will take care of it.
  //

  // set status code and send body (if any)
  res.statusCode = code;
  res.end(body);
}


////////////////////////////////////////////////////////////////////////////////


// Sanitize URL (appends HOST if needed), removes query part
//
function clean_req_url(req) {
  var host = req.headers.host;

  if (-1 === nodeca.runtime.router.__vhosts__.known.indexOf(host)) {
    host = nodeca.runtime.router.__vhosts__.default_host;
  }

  if (host) {
    host = '//' + host;
  }

  return host + req.pathname;
}


// Handles errors.
//
function process_error(req, res, err, env) {
  var body;

  //
  // user asks for request termination providing:
  //
  //    - statusCode  (Number)
  //    - headers     (Object)        Optional
  //    - body        (String|Buffer) Optional
  //

  if (err.statusCode) {
    err.headers = _.defaults(err.headers || {}, {'Content-Type': 'text/plain; charset=utf-8'});
    end(req, res, err.statusCode, err.headers, err.body, env);
    return;
  }

  //
  // exceptions or fatal fuckup happened
  //

  body = ('development' !== nodeca.runtime.env) ? 'Application error'
       : (err.stack || err.toString());
  end(req, res, 500, {'Content-Type': 'text/plain; charset=utf-8'}, body, env, err);
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
    end(http.req, http.res, resp.statusCode || 200, resp.headers, resp.body, env);
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

    end(http.req, http.res, resp.statusCode || 200, resp.headers, buffer, env);
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function handle_http(req, res) {
  var query  = req.query,
      match  = nodeca.runtime.router.match(clean_req_url(req)),
      // mix GET QUERY params (part after ? in URL) and params from router
      // params from router take precedence
      params = _.extend({}, query, (match || {}).params),
      func;

  if (!match) {
    // Route not found
    process_error(req, res, { statusCode: 404 });
    return;
  }

  func = HashTree.get(nodeca.server, match.meta);
  nodeca.filters.run(match.meta, params, func, finalize, env({
    http:   { req: req, res: res },
    method: match.meta
  }));
};
