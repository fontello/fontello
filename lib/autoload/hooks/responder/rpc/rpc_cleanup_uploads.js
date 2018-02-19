// Remove files uploaded by users using RPC
//

'use strict';

const unlink  = require('util').promisify(require('fs').unlink);


module.exports = function (N) {

  N.wire.after('responder:rpc', { priority: 100, ensure: true }, function rpc_uploads_cleanup(env) {
    let files = [];

    Object.keys(env.req.files).forEach(fieldName => {
      files = files.concat(env.req.files[fieldName].map(file => file.path));
    });

    // don't delay the response waiting for files to be removed
    Promise.all(files.map(filename => unlink(filename)))
      .catch(function (err) {
        if (err.code !== 'ENOENT') {
          N.logger.error("Can't remove uploaded files: " + (err.stack || err.message || err));
        }
      });
  });
};
