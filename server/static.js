"use strict";


/**
 *  server
 **/


/*global nodeca, _*/


// stdlib
var path = require('path');
var http = require('http');


// 3rd-party
var send = require('send');


////////////////////////////////////////////////////////////////////////////////


var root    = path.join(nodeca.runtime.apps[0].root, 'public/root');
var logger  = nodeca.logger.getLogger('server.static');


////////////////////////////////////////////////////////////////////////////////


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
    callback({statusCode: 400, body: "HTTP ONLY"});
    return;
  }

  req = this.origin.http.req;
  res = this.origin.http.res;

  if ('GET' !== req.method && 'HEAD' !== req.method) {
    callback({statusCode: 400});
    return;
  }

  send(req, params.file)
    .root(root)
    .on('error', function (err) {
      if (404 === err.status) {
        callback({statusCode: 404});
        return;
      }

      callback(err);
    })
    .on('directory', function () {
      callback({statusCode: 400});
    })
    .on('end', function() {
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
