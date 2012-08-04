"use strict";


/*global nodeca, _*/


// stdlib
var url = require('url');


// 3rd-party
var qs = require('qs');


// internal
var env = require('../../env');
var handle_http = require('./http/handle_http');
var handle_rpc  = require('./http/handle_rpc');


////////////////////////////////////////////////////////////////////////////////


// Attach HTTP application server to the given `server`
//
module.exports.attach = function attach(server, next) {

  //
  // For each connection - update timeout & disable buffering
  //

  server.addListener("connection", function (socket) {
    socket.setTimeout(15 * 1000);
    socket.setNoDelay();
  });

  //
  // Define application runner
  //

  server.on('request', function (req, res) {
    var parsed  = url.parse(req.url),
        handle  = ('/rpc' === parsed.pathname) ? handle_rpc : handle_http,
        data    = '';

    req.query     = qs.parse(parsed.query || '');
    req.pathname  = parsed.pathname;

    // start harvesting POST data
    req.on('data', function (chunk) {
      data += chunk;
    });

    // when done, merge post params and handle request
    req.on('end', function () {
      req.params = _.defaults(qs.parse(data), req.query);
      handle(req, res);
    });
  });

  //
  // HTTP server is ready
  //

  next();

};
