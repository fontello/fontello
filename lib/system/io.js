// IO status/error codes used by RPC and HTTP servers
'use strict';


exports.OK                  = 200;
exports.REDIRECT_PERMANENT  = 301; // use with caution!
exports.REDIRECT            = 302;
exports.NOT_MODIFIED        = 304;
exports.BAD_REQUEST         = 400;
exports.FORBIDDEN           = 403;
exports.NOT_FOUND           = 404;
exports.LENGTH_REQUIRED     = 411; // used in uploader's size check logic
exports.CLIENT_ERROR        = 460;
exports.INVALID_CSRF_TOKEN  = 461;
exports.INVALID_LIVE_TOKEN  = 462;
exports.APP_ERROR           = 500;
exports.ECOMMUNICATION      = 1000;
exports.EWRONGVER           = 1001;
