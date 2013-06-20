// Initializes (start) HTTP and RPC server listeners.
// Used as last step in `cli/server.js`
//


"use strict";


// stdlib
var fs    = require('fs');
var path  = require('path');
var http  = require('http');
var https = require('https');
var url   = require('url');
var querystring = require('querystring');


// 3rd-party
var _        = require('lodash');
var async    = require('async');
var parseURL = require('pointer').parseURL;


// internal
var env = require('../env');


////////////////////////////////////////////////////////////////////////////////


// Parse binding config and returns a parsed map:
//
//  {
//    '127.0.0.1:3000': {
//      address: '127.0.0.1',
//      port:    3000,
//      ssl:     null,
//      hosts:  [ 'localhost', ... ]
//    },
//    // ...
//  }
//
function extractBindings(config, mainApp) {
  var result = {};

  // Collect non-SSL bindings.
  _.forEach(config, function (options, apiPath) {
    if ('_' === apiPath) {
      return; // skip special case keyword
    }

    if (!result[options.listen]) {
      result[options.listen] = {
        address:   options.listen.address
      , port:      options.listen.port
      , forwarded: options.forwarded
      , hosts:     []
      , ssl:       null
      };
    }
  });

  // Collect SSL bindings.
  _(config).select('ssl').forEach(function (options, apiPath) {
    if ('_' === apiPath) {
      return; // skip special case keyword
    }

    if (!result[options.ssl.listen]) {
      result[options.ssl.listen] = {
        address:   options.ssl.listen.address
      , port:      options.ssl.listen.port
      , forwarded: options.ssl.forwarded
      , hosts:     []
      , ssl:       _.omit(options.ssl, 'listen')
      };

      // Read files.
      _(options.ssl).pick('key', 'cert').map(function (filename, key) {
        filename = path.resolve(mainApp.root, filename);

        try {
          result[options.ssl.listen].ssl[key] = fs.readFileSync(filename, 'utf8');
        } catch (err) {
          N.logger.error("Can't read %s-file from SSL config (%s): %s", key, filename, err);
        }
      });
    }
  });

  // Fill-in host lists that should be served by <address:port>
  _.forEach(config, function (options, apiPath) {
    if ('_' === apiPath) {
      return; // skip special case keyword
    }
    
    var host = parseURL(options.mount).host || '*';

    // For non-SSL.
    if (!_.contains(result[options.listen].hosts, host)) {
      result[options.listen].hosts.push(host);
    }

    // For SSL.
    if (options.ssl && !_.contains(result[options.ssl.listen].hosts, host)) {
      result[options.ssl.listen].hosts.push(host);
    }
  });

  return result;
}


// Returns protocol name of `req` request object.
// If `isForwarded` is true, it will respect X-Forwarded-* headers used when
// Nodeca is behind a proxy.
//
function getRequestProtocol(req, isForwarded) {
  if (isForwarded) {
    if ('on' === req.headers['x-forwarded-ssl']) {
      return 'https';
    }
    
    if (req.headers['x-forwarded-scheme']) {
      return req.headers['x-forwarded-scheme'];
    }
    
    if (req.headers['x-forwarded-proto']) {
      return req.headers['x-forwarded-proto'].split(/\s*,\s*/)[0];
    }
  }

  return req.connection.encrypted ? 'https' : 'http';
}


// Returns remote IP address of `req` request object.
// If `isForwarded` is true, it will respect X-Forwarded-For header used when
// Nodeca is behind a proxy.
//
function getRequestRemoteAddress(req, isForwarded) {
  if (isForwarded && req.headers['x-forwarded-for']) {
    // X-Forwarded-For can contain chain of proxies.
    return req.headers['x-forwarded-for'].split(/\s*,\s*/)[0];
  }

  return req.connection.remoteAddress;
}


// Takes a params hash (can be nested) and tries to parse each string-value as
// number or boolean. Returns a new hash with parsed values.
//
function castParamTypes(inputValue) {
  var parsedValue;

  if (_.isArray(inputValue)) {
    return _.map(inputValue, castParamTypes);

  } else if (_.isObject(inputValue)) {
    parsedValue = {};

    _.forEach(inputValue, function (value, key) {
      parsedValue[key] = castParamTypes(value);
    });

    return parsedValue;

  } else if ('true' === inputValue) {
    return true;

  } else if ('false' === inputValue) {
    return false;

  } else if (/^[0-9\.\-]+$/.test(inputValue)) {
    parsedValue = Number(inputValue);
    return String(parsedValue) === inputValue ? parsedValue : inputValue;

  } else {
    return inputValue;
  }
}


// Parses URL query string and resolves numbers and booleans.
//
function parseQueryString(inputQuery) {
  if (!inputQuery) {
    return {};
  }

  return castParamTypes(querystring.parse(String(inputQuery)));
}


// MODULE EXPORTS //////////////////////////////////////////////////////////////


// starts http(s) server(s) and attach application listener to it
//
module.exports = function (N) {

  N.wire.on("init:server", function models_init(N, cb) {
    var bindings = extractBindings(N.config.bind, N.runtime.mainApp),
        handle_invalid_host = N.config.bind._;

    //
    // set "host not found" handler if it was not set
    //

    if (!_.isFunction(handle_invalid_host)) {
      handle_invalid_host = function (req, res) {
        res.writeHead(N.io.NOT_FOUND, { 'Content-Type': 'text/plain' });
        res.end('Invalid host ' + req.headers.host);
      };
    }

    //
    // bind listeners
    //

    async.forEachSeries(_.keys(bindings), function (point, next) {
      var options = bindings[point],
          address = options.address,
          port    = options.port,
          server,
          host_is_valid;

      try {
        server = options.ssl ? https.createServer(options.ssl) : http.createServer();
      } catch (err) {
        next(err); // Possibly bad SSL options.
        return;
      }

      //
      // Create host validation function
      //

      if (_.include(options.hosts, '*')) {
        // if binding address:port has *any host* mount point,
        // skip host validation
        host_is_valid = function () {
          return true;
        };
      } else {
        host_is_valid = function (host) {
          return _.include(options.hosts, host);
        };
      }

      //
      // attach event handlers
      //

      server.on('error', function handle_startup_error(err) {
        var err_prefix = "Can't bind to <" + address + "> with port <" + port + ">: ";

        if ('EADDRINUSE' === err.code) {
          next(err_prefix + 'Address in use...');
          return;
        }

        if ('EADDRNOTAVAIL' === err.code) {
          // system has no such ip address
          next(err_prefix + 'Address is not available...');
          return;
        }

        if ('ENOENT' === err.code) {
          // failed resolve addressname to ip address
          next(err_prefix + "Failed to resolve IP address...");
          return;
        }

        // unexpected / unknown error
        next(err_prefix + err);
      });


      server.on('connection', function handle_connection(socket) {
        socket.setTimeout(15 * 1000);
        socket.setNoDelay();
      });


      server.on('request', function handle_request(req, res) {
        var protocol, isEncrypted, httpMethod, parsedUrl, fullUrl, type, routeMatch;

        if (_.isEmpty(req.headers.host)) {
          // Host header is not set or empty.
          res.writeHead(N.io.BAD_REQUEST, { 'Content-Type': 'text/plain' });
          res.end('[' + N.io.BAD_REQUEST + '] Bad Request: missed "Host" header');
          return;
        }

        if (!host_is_valid(req.headers.host)) {
          // Host is unknown.
          handle_invalid_host(req, res);
          return;
        }

        // Frontend server may handle HTTPS request from the client
        // but connect with us via plain HTTP. So, detect protocol.
        protocol     = getRequestProtocol(req, options.forwarded);
        isEncrypted  = 'https' === protocol;

        httpMethod   = req.method.toLowerCase();
        parsedUrl    = url.parse(req.url);
        fullUrl      = protocol + '://' + req.headers.host + parsedUrl.pathname;
        req.query    = parseQueryString(parsedUrl.query);

        //
        // Choose a responder to use.
        //

        if ('/io/rpc' === parsedUrl.pathname) {
          type = 'rpc';
        } else {
          type = 'http';

          routeMatch = _.find(N.runtime.router.matchAll(fullUrl), function (match) {
            return _.has(match.meta.methods, httpMethod);
          });

          if (routeMatch) {
            type = routeMatch.meta.responder;
            routeMatch.params = castParamTypes(routeMatch.params);
          }
        }

        //
        // Try to process request: create enviroment & run responder chain
        // Responders are totally pluggable, via hooks
        //

        var _env = env(N, {
          req:           req
        , res:           res
        , type:          type
        , isEncrypted:   isEncrypted
        , matched:       routeMatch
        , remoteAddress: getRequestRemoteAddress(req, options.forwarded)
        });

        N.wire.emit('responder:' + type, _env);
      });


      server.on('listening', function handle_listening() {
        // remove error and listening handlers,
        // once we successfully bounded on address:port
        server.removeAllListeners('error');
        server.removeAllListeners('listening');

        //
        // Notify that we started listening
        //

        N.logger.info('Listening on %s:%s %s',
                      options.address,
                      options.port,
                      options.ssl ? 'SSL' : 'NON-SSL');

        //
        // Successfully binded, process to the next mount point
        //

        next();
      });

      //
      // try to bind to the port
      //

      server.listen(port, address);
    },

    function (err) {
      if (err) {
        cb(err);
        return;
      }

      N.logger.info('Services init done');
      cb();
    });
  });
};
