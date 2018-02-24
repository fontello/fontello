// Send dowloaded file
//
'use strict';


const http = require('http');
const Promise = require('bluebird');
const exists = Promise.promisify(require('level-exists'));


module.exports = function (N, apiPath) {
  const logger = N.logger.getLogger('font.download');


  N.validate(apiPath, {
    id: { type: 'string', required: true, pattern: /^[0-9a-f]{32}$/ }
  });


  N.wire.before(apiPath, async function check_font(env) {
    if (env.req.type !== 'http') throw N.io.BAD_REQUEST;
    if (env.origin.req.method !== 'GET' && env.origin.req.method !== 'HEAD') throw N.io.BAD_REQUEST;

    if (!(await exists(N.downloads, env.params.id))) throw N.io.NOT_FOUND;
  });


  N.wire.on(apiPath, function send_dowloaded_file(env, callback) {
    let req = env.origin.req;
    let res = env.origin.res;
    let filename = `filename=fontello-${env.params.id.substr(0, 8)}.zip`;

    N.downloads.get(env.params.id, { valueEncoding: 'binary' }, (err, body) => {
      if (err) {
        callback(err);
        return;
      }

      res.setHeader('Content-Disposition', 'attachment; ' + filename);
      res.end(body);

      logger.info('%s - "%s %s HTTP/%s" %d "%s" - %s',
        req.connection.remoteAddress,
        req.method,
        req.url,
        req.httpVersion,
        res.statusCode,
        req.headers['user-agent'] || '',
        http.STATUS_CODES[res.statusCode]
      );

      // No callback here because we don't need default responce processing.
    });
  });
};
