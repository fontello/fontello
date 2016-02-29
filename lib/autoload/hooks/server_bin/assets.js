// Asset files handler. Serves Mincer's generated asset files:
// - stylesheets
// - client-side javascripts
// - compiled view templates
// - etc

'use strict';


const path        = require('path');
const send        = require('send');
const compression = require('compression')();



module.exports = function (N) {
  var root = path.join(N.mainApp.root, 'assets', 'public');


  N.validate('server_bin:core.assets', {
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


  N.wire.on('server_bin:core.assets', function asset_file_send(env, callback) {
    compression(env.origin.req, env.origin.res, callback);
  });

  N.wire.on('server_bin:core.assets', function asset_file_send(env, callback) {
    var req = env.origin.req,
        res = env.origin.res;

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      callback(N.io.BAD_REQUEST);
      return;
    }

    send(req, env.params.path, { root, index: false, maxage: Infinity })
      .on('error', err => { callback(err.status); })
      .on('directory', () => { callback(N.io.BAD_REQUEST); })
      .on('end', () => { env.log_request(env); })
      .pipe(res);
  });
};
