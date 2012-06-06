'use strict';


/*global nodeca*/


module.exports = function fix_vhost(params, callback) {
  var http = this.origin.http, host;

  if (!http) {
    callback();
    return;
  }

  host = (http.req.headers.host || '').split(':')[0];

    // if no host in config - then we accept any host
  if (!nodeca.config.listen.host) {
    callback();
    return;
  }

  // known hostname
  if (host === nodeca.config.listen.host) {
    callback();
    return;
  }

  // fix hostname by redirect
  host = nodeca.config.listen.host;
  if (nodeca.config.listen.port && 80 !== nodeca.config.listen.port) {
    host += ':' + nodeca.config.listen.port;
  }

  callback({redirect: "http://" + host, statusCode: 301});
};
