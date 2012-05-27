"use strict";


/*global nodeca, _*/


// nodeca
var HashTree = require('nlib').Support.HashTree;


// 3rd-party
var Async = require('nlib').Vendor.Async;


////////////////////////////////////////////////////////////////////////////////


function start_server(next) {
  var server, host, port, err_handler;

  // create server
  host    = nodeca.config.listen.host || 'localhost';
  port    = nodeca.config.listen.port || 3000;
  server  = require('http').createServer();

  err_handler = function (err) {
    var err_prefix = "Can't bind to <" + host + "> with port <" + port + ">: ";

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
      // failed resolve hostname to ip address
      next(err_prefix + "Failed to resolve IP address...");
      return;
    }

    // unexpected / unknown error
    next(err_prefix + err);
  };

  server.on('error', err_handler);

  // start server
  server.listen(port, host, function () {
    server.removeListener('error', err_handler);
    next(null, server);
  });
}


// MODULE EXPORTS //////////////////////////////////////////////////////////////


module.exports = function (args) {
  return function (next) {
    start_server(function (err, server) {
      if (err) {
        next(err);
        return;
      }

      Async.series([
        function (next) { require('./server/http').attach(server, next); },
        function (next) { require('./server/realtime').attach(args, server, next); }
      ], next);
    });
  };
};
