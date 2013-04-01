'use strict';


// stdlib
var path = require('path');


// internal
var DOWNLOAD_DIR    = require('./_common').DOWNLOAD_DIR;
var JOBS            = require('./_common').JOBS;
var getDownloadUrl  = require('./_common').getDownloadUrl;
var getDownloadPath = require('./_common').getDownloadPath;


////////////////////////////////////////////////////////////////////////////////


// request font generation status
module.exports = function (N, apiPath) {
  N.validate(apiPath, {
    id: {
      type: "string"
    , required: true
    }
  });

  N.wire.on(apiPath, function (env, callback) {
    var file = path.join(DOWNLOAD_DIR, getDownloadPath(env.params.id));

    if (JOBS[env.params.id]) {
      env.response.data.status = 'enqueued';
      callback();
      return;
    }

    path.exists(file, function (exists) {
      if (!exists) {
        // job not found
        env.response.data.status = 'error';
        env.response.error = 'Unknown font id (probably task crashed, try again).';
        callback();
        return;
      }

      // job done
      env.response.data.status = 'finished';
      env.response.data.url = getDownloadUrl(env.params.id);
      callback();
    });
  });
};
