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


function log(req, res, code, error, apiPath) {
  var logger  = nodeca.logger.getLogger(apiPath ? ('server.' + apiPath) : 'server'),
      level   = error ? 'error' : 'info';

  logger[level]('%s - "%s %s HTTP/%s" %d "%s" - %s',
                req.connection.remoteAddress,
                req.method,
                req.url,
                req.httpVersion,
                code,
                req.headers['user-agent'],
                (error && error.stack) || (error && error.message) || error || 'OK');
}

// Ends response with given `error`, `response` and nodeca version.
//
function end(req, res, error, response, apiPath) {
  var payload, compressor;

  //
  // Log request
  //

  log(req, res, 200, error, response, apiPath);


  //
  // Set some obligatory headers
  //

  res.removeHeader('Accept-Ranges');

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Server', 'Sansung Calakci');
  res.setHeader('Date',   (new Date).toUTCString());

  //
  // Prepare and stringify payload
  //

  payload = JSON.stringify({
    version:  nodeca.runtime.version,
    error:    error,
    response: error ? null : response
  });

  //
  // Status code always OK
  //

  res.statusCode = 200;

  //
  // Check whenever compression is allowed by client or not
  //

  compressor = compression.is_allowed(req);

  //
  // Mark for proxies, that we can return different content (plain & gzipped),
  // depending on specified (comma-separated) headers
  //

  res.setHeader('Vary', 'Accept-Encoding');
  res.setHeader('Content-Type', 'application/json');

  //
  // Return raw response, if compression is not allowed or body is too small
  //

  if (false === compressor || 500 > Buffer.byteLength(payload)) {
    res.end(payload);
    return;
  }

  //
  // Compress body
  //

  compression.process(compressor, payload, function (err, buffer) {
    if (err) {
      // should nver happen
      nodeca.logger.error('Failed to compress RPC response', err);
      res.end(payload);
      return;
    }

    //
    // Compression is allowed and succeed, set Content-Encoding
    //

    res.setHeader('Content-Encoding', compressor);
    res.end(buffer);
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function handle_rpc(req, res) {
  var payload = req.params, msg, func;

  // invalid request
  if ('POST' !== req.method) {
    end(req, res, { statusCode: 400, body: 'Invalid request method' });
    return;
  }

  // invalid payload
  if (!payload.version || !payload.method) {
    end(req, res, { statusCode: 400, body: 'Invalid payload' });
    return;
  }

  // invalid client version.
  // client will check server version by it's own,
  // so in fact this error is not used by client
  if (payload.version !== nodeca.runtime.version) {
    end(req, res, { statusCode: 400, body: 'Client version mismatch' });
    return;
  }

  func = HashTree.get(nodeca.server, payload.method);

  // invalid method name
  if (!func) {
    end(req, res, { statusCode: 404, body: 'API path not found' });
    return;
  }

  nodeca.filters.run(payload.method, payload.params || {}, func, function (err) {
    if (err) {
      if (!err.statusCode && 'development' !== nodeca.runtime.env) {
        nodeca.logger.fatal(err);
        err = 'Application error';
      }
    }

    end(req, res, err, this.response, this.request.method);
  }, env({
    rpc:    { req: req, res: res },
    method: payload.method
  }));
};
