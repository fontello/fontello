// Static file handler. Serves all of the files from `public/root` directory
// under the main application root path.

'use strict';


var path = require('path');
var send = require('send');


module.exports = function (N) {
  var root = path.join(N.mainApp.root, 'public/root');


  N.validate('server_bin:core.static', {
    // DON'T validate unknown params - those can exists,
    // if someone requests '/myfile.txt?xxxx' instead of '/myfile.txt/
    additionalProperties: true,
    properties: {
      file: {
        type: 'string',
        required: true
      }
    }
  });


  N.wire.on('server_bin:core.static', function static_file_send(env, callback) {
    var req = env.origin.req,
        res = env.origin.res;

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      callback(N.io.BAD_REQUEST);
      return;
    }

    send(req, env.params.file, { root, index: false })
      .on('error', err => { callback(err.status); })
      .on('directory', () => { callback(N.io.BAD_REQUEST); })
      .on('end', () => { env.log_request(env); })
      .pipe(res);
  });
};
