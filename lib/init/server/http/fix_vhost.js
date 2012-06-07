'use strict';


/*global nodeca*/


////////////////////////////////////////////////////////////////////////////////


// TODO: test before assigning this middleware
var NOHOST_RE = new RegExp(
  '^(?:' +
  [ 'localhost',
    '\\d{1,3}(?:\\.\\d{1,3}){3}',
    '(?::1|[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){4,7})'
  ].join('|') +
  ')$', 'i');

////////////////////////////////////////////////////////////////////////////////


module.exports = function fix_vhost(params, callback) {
  var http = this.origin.http, host;

  if (!http) {
    callback();
    return;
  }

  // if no host in config - then we accept any host
  if (!nodeca.config.listen.host || NOHOST_RE.test(nodeca.config.listen.host)) {
    callback();
    return;
  }

  host = (http.req.headers.host || '').split(':')[0];

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

  callback({statusCode: 302, headers: {'Location': 'http://' + host}});
};
