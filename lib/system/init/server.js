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


// 3rd-party
var _         = require('lodash');
var async     = require('async');
var parseURL  = require('pointer').parseURL;
var qs        = require('qs');


// internal
var env         = require('../env');



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
function extractBindings(config, appList) {
  var result = {};

  //
  // Collect unique address:port pairs,
  // with `ssl` option (if exist)
  // and list of hosts they serve
  //

  _.each(config, function (options, key) {
    var host;

    if ('_' === key) {
      // skip special case keyword
      return;
    }

    if (!result[options.listen]) {
      //
      // <address:port> first time met - create base structure
      //

      result[options.listen] = {
        address:  options.listen.split(':')[0] || '0.0.0.0',
        port:     options.listen.split(':')[1] || 80,
        ssl:      options.ssl,
        hosts:    []
      };
    }

    //
    // fill in host (unique) that should be served by <address:port>
    //

    host = parseURL(options.mount).host || '*';

    if (-1 === result[options.listen].hosts.indexOf(host)) {
      result[options.listen].hosts.push(host);
    }
  });

  //
  // Read `key`, `cert` and `pfx` files if given
  //

  _.each(result, function (options) {
    if (options.ssl) {
      _.each(options.ssl, function (filename, type) {
        if ('pfx' === type || 'key' === type || 'cert' === type) {
          filename = path.resolve(appList[0].root, filename);
          options.ssl[type] = fs.readFileSync(filename);
        }
      });
    }
  });

  return result;
}


// MODULE EXPORTS //////////////////////////////////////////////////////////////


// starts http(s) server(s) and attach application listener to it
//
module.exports = function (N) {

  N.wire.on("init:server", function models_init(N, cb) {
    var bindings = extractBindings(N.config.bind, N.runtime.apps),
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
          server  = options.ssl ? https.createServer(options.ssl) : http.createServer(),
          host_is_valid;

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
        var parsedUrl, type
          , routeMatch = null;

        if (!host_is_valid(req.headers.host)) {
          handle_invalid_host(req, res);
          return;
        }

        parsedUrl    = url.parse(req.url);
        req.query    = qs.parse(parsedUrl.query || '');
        req.pathname = parsedUrl.pathname;
        req.fullUrl  = (options.ssl ? 'https': 'http') + '://' +
                       (req.headers.host || '*') + req.pathname;

        //
        // Choose a responder to use.
        //

        if ('/io/rpc' === parsedUrl.pathname) {
          type = 'rpc';
        } else {
          // TODO: Cache the matching result for further use.
          routeMatch = N.runtime.router.match(req.fullUrl);

          if (routeMatch && routeMatch.params.responder) {
            type = routeMatch.params.responder;
          } else {
            type = 'http'; // Default.
          }
        }

        //
        // Try to process request: create enviroment & run responder chain
        // Responders are totally pluggable, via hooks
        //

        var _env = env(N, {
          req:    req
        , res:    res
        , type:   type
        , matched: routeMatch
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
