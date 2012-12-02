"use strict";


/**
 *  server
 **/


/*global N, _*/


// stdlib
var path = require('path');
var http = require('http');


// 3rd-party
var send = require('send');


////////////////////////////////////////////////////////////////////////////////


var root    = path.join(N.runtime.apps[0].root, 'public/root');
var logger  = N.logger.getLogger('server.static');


////////////////////////////////////////////////////////////////////////////////


// Validate input parameters
N.validate({
  file: {
    type: "string",
    required: true
  }
});


/**
 *  server.static(params, callback) -> Void
 *
 *  - **HTTP only**
 *
 *  Middleware that serves static assets from `public/root` directory under the
 *  main application root path.
 **/
module.exports = function (params, callback) {
  var req, res;

  if (!this.origin.http) {
    callback({code: N.io.BAD_REQUEST, body: "HTTP ONLY"});
    return;
  }

  req = this.origin.http.req;
  res = this.origin.http.res;

  if ('GET' !== req.method && 'HEAD' !== req.method) {
    callback(N.io.BAD_REQUEST);
    return;
  }

  send(req, params.file)
    .root(root)
    .on('error', function (err) {
      if (404 === err.status) {
        callback(N.io.NOT_FOUND);
        return;
      }

      callback(err);
    })
    .on('directory', function () {
      callback(N.io.BAD_REQUEST);
    })
    .on('end', function () {
      logger.info('%s - "%s %s HTTP/%s" %d "%s" - %s',
                  req.connection.remoteAddress,
                  req.method,
                  req.url,
                  req.httpVersion,
                  res.statusCode,
                  req.headers['user-agent'],
                  http.STATUS_CODES[res.statusCode]);
    })
    .pipe(res);
};
