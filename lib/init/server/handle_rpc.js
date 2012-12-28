// RPC (AJAX) requests handler


"use strict";


/*global underscore, N*/



// 3rd-party
var qs = require('qs');


// internal
var _           = underscore;
var env         = require('../../env');
var compression = require('./compression');
var logger      = N.logger.getLogger('rpc');


////////////////////////////////////////////////////////////////////////////////


var MAX_POST_DATA = 1000 * 1024; // Max post data in bytes


////////////////////////////////////////////////////////////////////////////////


function log(req, res) {
  var level = 'info', message = 'OK';

  if (res.error) {
    message = res.error.message || JSON.stringify(res.error);

    if (!res.error.code || N.io.APP_ERROR <= res.error.code) {
      level = 'fatal';
    } else if (N.io.BAD_REQUEST <= res.error.code && N.io.APP_ERROR > res.error.code) {
      level = 'error';
    } else {
      level = 'info';
    }
  }

  // FIXME: Do not forget to filter-out sensitive params upon logging
  // if (req.params.password) req.params.password = '***';
  // if (req.params.password_confirmation) req.params.password_confirmation = '***';

  logger[level]('%s - %s() - "%s" - %s',
                req.connection.remoteAddress,
                req.payload.method,
                req.headers['user-agent'],
                message);
}


// Ends response with given `error`, `response` and N version.
//
function end(req, res, error, response) {
  var payload, compressor, size;

  //
  // Set some obligatory headers
  //

  res.removeHeader('Accept-Ranges');

  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.setHeader('Server', 'Sansung Calakci');
  res.setHeader('Date',   (new Date).toUTCString());

  //
  // Prepare and stringify payload
  //

  payload = res.payload = JSON.stringify({
    version:  N.runtime.version,
    error:    error,
    response: error ? null : response
  });

  //
  // Status code always OK
  //

  res.error       = error;
  res.statusCode  = N.io.OK;

  //
  // Check whenever compression is allowed by client or not
  //

  compressor = compression.is_allowed(req);

  //
  // Mark for proxies, that we can return different content (plain & gzipped),
  // depending on specified (comma-separated) headers
  //

  res.setHeader('Vary', 'Accept-Encoding');

  //
  // Return raw response, if compression is not allowed or body is too small
  //

  size = Buffer.byteLength(payload);

  if (false === compressor || 500 > size) {
    log(req, res);
    res.setHeader('Content-Length', size);
    res.end(payload);
    return;
  }

  //
  // Compress body
  //

  compression.process(compressor, payload, function (err, buffer) {
    if (err) {
      // should never happen
      N.logger.fatal('Failed to compress RPC response', err);

      res.error   = err;
      res.payload = JSON.stringify({
        version:  N.runtime.version,
        error:    err,
        response: null
      });

      log(req, res);
      res.end(res.payload);
      return;
    }

    //
    // Compression is allowed and succeed, set Content-Encoding
    //

    res.setHeader('Content-Encoding', compressor);
    res.setHeader('Content-Length', buffer.length);
    log(req, res);
    res.end(buffer);
  });
}


// handles error
//
function process_error(req, res, err) {
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
    end(req, res, err, null);
    return;
  }

  //
  // exceptions or fatal fuckup happened
  //

  logger.fatal(err.stack || err.message || err.toString());
  end(req, res, { code: N.io.APP_ERROR }, null);
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function handle_rpc(req, res) {
  var data = '';

  //
  // set empty payload object
  //

  req.payload = {};

  //
  // invalid request
  //

  if ('POST' !== req.method) {
    process_error(req, res, N.io.BAD_REQUEST);
    return;
  }

  //
  // Set encoding, to glue data chunks as strings.
  // In other case you need to work with buffer, to avoid
  // breaking unicode characters.
  //
  // We don't rpc to work with big uploads, so, strings are enougth
  //

  req.setEncoding('utf8');

  //
  // start harvesting POST data
  //

  req.on('data', function (chunk) {
    if (MAX_POST_DATA < Buffer.byteLength(data += chunk)) {
      // max allowed post data reached, drop request.
      req.removeAllListeners('data');
      req.removeAllListeners('end');

      process_error(req, res,
        {
          code: N.io.BAD_REQUEST,
          message: 'Too big post data'
        }
      );

      // Force destroy incoming connection
      req.connection.destroy();
    }
  });

  //
  // when done (on success) process POST data and handle request
  //

  req.on('end', function () {
    var payload = _.defaults(qs.parse(data), req.query),
        params  = payload.params || {},
        func, validation;

    // save payload in the request
    req.payload = payload;

    // save params reference for logs
    req.params = params;

    // save CSRF token if it was sent
    req.csrf = payload.csrf;

    // invalid payload
    if (!payload.version || !payload.method) {
      process_error(req, res, N.io.BAD_REQUEST);
      return;
    }

    // invalid client version.
    // client will check server version by it's own,
    // so in fact this error is not used by client
    if (payload.version !== N.runtime.version) {
      process_error(req, res, N.io.BAD_REQUEST);
      return;
    }

    func = N.server[payload.method];

    // invalid method name
    if (!func) {
      process_error(req, res, N.io.NOT_FOUND);
      return;
    }

    validation = N.validate.test(payload.method, params);

    // when method has no validation schema,
    // test() returns `null`, object with `valid` property otherwise
    if (!validation) {
      process_error(req, res, "Params schema is missing for " + payload.method);
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

    N.filters.run(payload.method, params, func, function (err) {
      if (err) {
        process_error(req, res, err);
        return;
      }

      end(req, res, null, this.response);
    }, env({
      rpc:    { req: req, res: res },
      method: payload.method
    }));
  });
};
