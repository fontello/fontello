// IO status/error codes used by RPC and HTTP servers
'use strict';


exports.OK                  = 200;
exports.REDIRECT            = 302;
exports.NOT_MODIFIED        = 304;
exports.BAD_REQUEST         = 400;
exports.NOT_AUTHORIZED      = 401;
exports.NOT_FOUND           = 404;
exports.CLIENT_ERROR        = 460;
exports.INVALID_CSRF_TOKEN  = 461;
exports.APP_ERROR           = 500;
exports.ECOMMUNICATION      = 1000;
exports.EWRONGVER           = 1001;
