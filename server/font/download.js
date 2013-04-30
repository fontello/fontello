// Send dowloaded file
//


'use strict';


var http = require('http');
var send = require('send');
var fontBuilder = require('./_lib/font_builder');


// font downloader middleware
var FINGERPRINT_RE = /-([0-9a-f]{32,40})\.[^.]+$/;


module.exports = function (N, apiPath) {
  var logger  = N.logger.getLogger('font.download')
    , builder = fontBuilder(N);


  N.validate(apiPath, {
    file: {
      type: 'string'
    , required: true
    }
  });


  N.wire.on(apiPath, function (env, callback) {
    var req = env.origin.req
      , res = env.origin.res;

    if ('http' !== env.request.type) {
      callback(N.io.BAD_REQUEST);
      return;
    }

    if ('GET' !== req.method && 'HEAD' !== req.method) {
      callback(N.io.BAD_REQUEST);
      return;
    }

    send(req, env.params.file)
      .root(builder.outputDir)
      .on('error', function (err) {
        callback(err.status);
      })
      .on('directory', function () {
        callback(N.io.BAD_REQUEST);
      })
      .on('stream', function () {
        var filename, match = FINGERPRINT_RE.exec(env.params.file);

        if (match) {
          // Beautify zipball name.
          filename = 'filename=fontello-' + match[1].substr(0, 8) + '.zip';
          res.setHeader('Content-Disposition', 'attachment; ' + filename);
        }
      })
      .on('end', function () {
        logger.info('%s - "%s %s HTTP/%s" %d "%s" - %s'
        , req.connection.remoteAddress
        , req.method
        , req.url
        , req.httpVersion
        , res.statusCode
        , req.headers['user-agent'] || ''
        , http.STATUS_CODES[res.statusCode]
        );
      })
      .pipe(res);
  });
};
