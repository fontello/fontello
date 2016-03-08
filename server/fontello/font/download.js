// Send dowloaded file
//
'use strict';


const http = require('http');
const send = require('send');
const mz   = require('mz');
const path = require('path');


module.exports = function (N, apiPath) {
  const logger = N.logger.getLogger('font.download');


  N.validate(apiPath, {
    id: { type: 'string', required: true, pattern: /^[0-9a-f]{32}$/ }
  });


  N.wire.before(apiPath, function* check_font(env) {
    if (env.req.type !== 'http') throw N.io.BAD_REQUEST;
    if (env.origin.req.method !== 'GET' && env.origin.req.method !== 'HEAD') throw N.io.BAD_REQUEST;

    let filepath = path.join(
      N.mainApp.root,
      'download',
      env.params.id.substr(0, 2),
      env.params.id.substr(2, 2),
      `${env.params.id}.zip`
    );
    let exists = yield mz.fs.exists(filepath);

    if (!exists) throw N.io.NOT_FOUND;
  });


  N.wire.on(apiPath, function send_dowloaded_file(env, callback) {
    let req = env.origin.req;
    let res = env.origin.res;

    send(req, path.join(env.params.id.substr(0, 2), env.params.id.substr(2, 2), `${env.params.id}.zip`))
      .root(path.join(N.mainApp.root, 'download'))
      .on('error', function (err) {
        callback(err.status);
      })
      .on('directory', function () {
        callback(N.io.BAD_REQUEST);
      })
      .on('stream', function () {
        // Beautify zipball name.
        let filename = 'filename=fontello-' + env.params.id.substr(0, 8) + '.zip';

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
