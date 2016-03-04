// Send dowloaded file
//
'use strict';


const http = require('http');
const send = require('send');
const fontBuilder = require('./_lib/builder');


module.exports = function (N, apiPath) {
  const logger = N.logger.getLogger('font.download');
  const builder = fontBuilder(N);


  N.validate(apiPath, {
    id: { type: 'string', required: true, pattern: /^[0-9a-f]{32}$/ }
  });


  N.wire.before(apiPath, function* check_font(env) {
    if (env.req.type !== 'http') throw N.io.BAD_REQUEST;
    if (env.origin.req.method !== 'GET' && env.origin.req.method !== 'HEAD') throw N.io.BAD_REQUEST;

    env.data.info = yield builder.checkFont(env.params.id);

    if (!env.data.info || !env.data.info.file) throw N.io.NOT_FOUND;
  });


  N.wire.on(apiPath, function send_dowloaded_file(env, callback) {
    let req = env.origin.req;
    let res = env.origin.res;

    send(req, env.data.info.file)
      .root(env.data.info.directory)
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
        logger.info('%s - "%s %s HTTP/%s" %d "%s" - %s',
          req.connection.remoteAddress,
          req.method,
          req.url,
          req.httpVersion,
          res.statusCode,
          req.headers['user-agent'] || '',
          http.STATUS_CODES[res.statusCode]
        );
      })
      .pipe(res);
  });
};
