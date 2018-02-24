// Static file handler. Serves all of the files from `public/root` directory
// under the main application root path.

'use strict';


const path        = require('path');
const send        = require('send');
const Promise     = require('bluebird');
const onFinished  = require('on-finished');


module.exports = function (N) {
  var root = path.join(N.mainApp.root, 'root');


  N.validate('server_bin:core.static', {
    // DON'T validate unknown params - those can exists,
    // if someone requests '/myfile.txt?xxxx' instead of '/myfile.txt/
    additionalProperties: true,
    properties: {
      path: {
        type: 'string',
        required: true
      }
    }
  });


  N.wire.on('server_bin:core.static', async function static_file_send(env) {
    var req = env.origin.req,
        res = env.origin.res;

    if (req.method !== 'GET' && req.method !== 'HEAD') throw N.io.BAD_REQUEST;

    await new Promise((resolve, reject) => {
      let ss = send(req, env.params.path, { root, index: false, maxAge: '7d' });

      // Errors with status are not fatal,
      // rethrow those up as code, not as Error
      ss.on('error', err => reject(err.status || err));

      onFinished(res, () => {
        if (res.statusCode) env.status = res.statusCode;
        resolve();
      });

      ss.pipe(res);
    });
  });
};
