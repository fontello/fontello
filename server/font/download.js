/*global underscore, N*/


"use strict";


// stdlib
var http = require('http');


// 3rd-party
var send = require('send');


// internal
var DOWNLOAD_DIR = require('./_common').DOWNLOAD_DIR;


////////////////////////////////////////////////////////////////////////////////


// logger of font downloads
var logger = N.logger.getLogger('server.font.download');


// font downloader middleware
var FINGERPRINT_RE = /-([0-9a-f]{32,40})\.[^.]+$/;


////////////////////////////////////////////////////////////////////////////////


// Validate input parameters
N.validate({
  file: {
    type: "string",
    required: true
  }
});


////////////////////////////////////////////////////////////////////////////////


// Send dowloaded file
module.exports = function (params, callback) {
  var match, req, res, filename;

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

  match = FINGERPRINT_RE.exec(params.file);

  if (match) {
    // beautify zipball name
    filename = 'filename=fontello-' + match[1].substr(0, 8) + '.zip';
    res.setHeader('Content-Disposition', 'attachment; ' + filename);
  }

  send(req, params.file)
    .root(DOWNLOAD_DIR)
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
