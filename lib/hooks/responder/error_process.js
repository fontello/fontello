// Process errors, if happens.
// AND make default answer (for http)
//

'use strict';


var http = require('http');
var _    = require('lodash');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {

  N.wire.after(['responder:http', 'responder:rpc'], { priority: 50 }, function error_process(env) {
    var err = env.err;

    if (!err) {
      return;
    }

    // Extend sugared errors
    // Example: next(404);
    if (err === +err) {
      env.body = http.STATUS_CODES[err];
      err = env.err = { code: env.err };
    }


    if (err.code) {
      env.status = err.code;

      env.headers = _.defaults(err.head || {}, {
        'Content-Type': 'text/plain; charset=utf-8'
      });

      if (err.data && 'object' === typeof err.data) {
        env.body = JSON.stringify(err.data);
      }
      return;
    }

    // Still no code -> we got Error object
    // Example: next(new Error('Fatal fuckup'))
    err = {
      code: N.io.APP_ERROR,
      data: err.stack || err.message || err.toString()
    };
    env.status = err.code;
    env.headers = { 'Content-Type': 'text/plain; charset=utf-8' };
    env.body = String(('development' !== N.runtime.env) ? 'Application error' : err.data);
  });
};
