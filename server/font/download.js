// Send dowloaded file
//


'use strict';


var http = require('http');
var send = require('send');
var fontBuilder = require('./_lib/builder');


module.exports = function (N, apiPath) {
  var logger  = N.logger.getLogger('font.download')
    , builder = fontBuilder(N);


  N.validate(apiPath, {
    id: {
      type: 'string'
    , required: true
    , pattern: /^[0-9a-f]{32}$/
    }
  });


  N.wire.on(apiPath, function (env, callback) {
    var req = env.origin.req
      , res = env.origin.res;

    if ('http' !== env.req.type) {
      callback(N.io.BAD_REQUEST);
      return;
    }

    if ('GET' !== req.method && 'HEAD' !== req.method) {
      callback(N.io.BAD_REQUEST);
      return;
    }

    builder.checkFont(env.params.id, function (err, result) {
      if (err) {
        callback(err);
        return;
      }

      if (!result || !result.file) {
        callback(N.io.NOT_FOUND);
        return;
      }

      send(req, result.file)
        .root(result.directory)
        .on('error', function (err) {
          callback(err.status);
        })
        .on('directory', function () {
          callback(N.io.BAD_REQUEST);
        })
        .on('stream', function () {
            // Beautify zipball name.
          var filename = 'filename=fontello-' + env.params.id.substr(0, 8) + '.zip';
          res.setHeader('Content-Disposition', 'attachment; ' + filename);
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
  });
};
