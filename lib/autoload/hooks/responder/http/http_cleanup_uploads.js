// Remove files uploaded by users using HTTP POST
//
'use strict';


const Promise = require('bluebird');
const fs      = require('mz/fs');


module.exports = function (N) {

  N.wire.after('responder:http', { priority: 100, ensure: true }, function rpc_uploads_cleanup(env) {
    let files = [];

    Object.keys(env.req.files).forEach(fieldName => {
      files = files.concat(env.req.files[fieldName].map(file => file.path));
    });

    // don't delay the response waiting for files to be removed
    Promise.map(files, filename => fs.unlink(filename))
      .catch(function (err) {
        if (err.code !== 'ENOENT') {
          N.logger.error("Can't remove uploaded files: " + (err.stack || err.message || err));
        }
      });
  });
};
