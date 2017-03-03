// Process errors, if happens.
// AND make default answer (for http)
//

'use strict';


const http = require('http');
const _    = require('lodash');


////////////////////////////////////////////////////////////////////////////////

// Note, we also listen `responder:bin` to unify logging & error responding

const CHANNELS = [ 'responder:http', 'responder:rpc', 'responder:bin' ];

module.exports = function (N) {

  N.wire.after(CHANNELS, { priority: 50 }, function error_process(env) {
    if (!env.err) return;

    let err = env.err_orig = env.err;

    // Extend sugared errors
    // Example: next(404);
    if (err === +err) {
      err = env.err = { code: env.err };
    }


    if (_.isPlainObject(err) && err.code) {
      env.status = err.code;

      env.headers = _.defaults(err.head || {}, {
        'Content-Type': 'text/plain; charset=utf-8'
      });

      if (err.data && typeof err.data === 'object') {
        env.body = JSON.stringify(err.data);
      } else {
        env.body = err.message || '[' + err.code + '] ' + http.STATUS_CODES[err.code];
      }

      if (!err.message) {
        // For convenience. This details will be send later via RPC
        err.message = http.STATUS_CODES[err.code];
      }

      return;
    }

    // Still no code -> we got Error object or string
    // Example: next(new Error('Fatal fuckup'))

    let e = {
      code: N.io.APP_ERROR
    };

    // Add message if required
    if (N.environment === 'development') {
      e.message = '[500] ' + (err.stack || err.message || err.toString());
    } else {
      e.message = _.isString(err) ? ('[500]' + err) : '[500] Internal Server Error';
    }

    env.err = e;

    env.status = e.code;
    env.headers = { 'Content-Type': 'text/plain; charset=utf-8' };
    env.body = e.message;
  });
};
