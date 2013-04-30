'use strict';


var _    = require('lodash');
var http = require('http');


module.exports = function (N) {
  N.wire.after('responder:bin', function bin_send_error(env) {
    var res = env.origin.res
      , err = env.err;

    if (!err) {
      return;
    }

    //
    // Fill the environment with information about the error.
    //

    // Extend sugared errors
    // Example: next(404);
    if (err === +err) {
      env.body = '[' + err + '] ' + http.STATUS_CODES[err];
      err = env.err = { code: env.err };
    }

    if (err.code) {
      env.status = err.code;

      env.headers = _.defaults(err.head || {}, {
        'Content-Type': 'text/plain; charset=utf-8'
      });

      if (err.data && 'object' === typeof err.data) {
        env.body = JSON.stringify(err.data);
      } else {
        env.body = err.message || '[' + err.code + '] ' + http.STATUS_CODES[err.code];
      }
    } else {
      // Still no code -> we got Error object
      // Example: next(new Error('Fatal fuckup'))
      err = {
        code: N.io.APP_ERROR,
        data: err.stack || err.message || err.toString()
      };

      env.status  = err.code;
      env.headers = { 'Content-Type': 'text/plain; charset=utf-8' };

      if ('development' === N.runtime.env) {
        env.body = err.data;
      } else {
        env.body = '[500] Internal Server Error';
      }
    }

    //
    // Send a response to the client.
    //

    res.statusCode = env.status;

    _.forEach(env.headers, function (headerValue, headerName) {
      res.setHeader(headerName, headerValue);
    });

    res.end(env.body);

    env.log_request(env);
  });
};
