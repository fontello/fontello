// Static file handler. Serves all of the files from `public/root` directory
// under the main application root path.

'use strict';


var path = require('path');
var send = require('send');


module.exports = function (N) {
  var root = path.join(N.runtime.mainApp.root, 'public/root');


  N.validate('server_bin:core.static', {
    // DON'T validate unknown params - those can sexists,
    // if someone requests '/myfile.txt?xxxx' instead of '/myfile.txt/
    additionalProperties: true,
    properties: {
      file: {
        type: "string",
        required: true
      }
    }
  });


  N.wire.on('server_bin:core.static', function (env, callback) {
    var req = env.origin.req
      , res = env.origin.res;

    if ('GET' !== req.method && 'HEAD' !== req.method) {
      callback(N.io.BAD_REQUEST);
      return;
    }

    send(req, env.params.file)
      .root(root)
      .on('error', function (err) {
        if (N.io.NOT_FOUND === err.status) {
          callback(N.io.NOT_FOUND);
        } else {
          callback(err);
        }
      })
      .on('directory', function () {
        callback(N.io.BAD_REQUEST);
      })
      .on('end', function () {
        env.log_request(env);
        callback();
      })
      .pipe(res);
  });
};
