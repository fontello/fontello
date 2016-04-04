// Invalid host handler. Redirect to default mount.
//
// In:
//
// - req
// - res
// - isEncrypted
//
'use strict';


const url = require('url');


module.exports = function (N) {

  N.wire.on('!sys.error.host_invalid', function sys_error_host_invalid(params) {
    let mount = (N.config.bind.default || {}).mount;

    if (!mount) return;

    let parsed_mount = url.parse(mount);

    if (!parsed_mount.host) return;

    parsed_mount.protocol = params.isEncrypted ? 'https' : 'http';

    params.res.writeHead(N.io.REDIRECT, { Location: url.resolve(url.format(parsed_mount), '/') });
    params.res.end();
  });
};
