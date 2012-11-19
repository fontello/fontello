'use strict';


/*global N*/


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


// Filter middleware that interrupts request and sends redirect response with
// new `Location` to default host if `Host` of request is unknown.
//
N.filters.before('', { weight: -900 }, function fix_vhost(params, callback) {
  var http = this.origin.http, host;

  if (!http) {
    callback();
    return;
  }

  // if no host in config - then we accept any host
  if (!N.config.listen.host || NOHOST_RE.test(N.config.listen.host)) {
    callback();
    return;
  }

  host = (http.req.headers.host || '').split(':')[0];

  // known hostname
  if (host === N.config.listen.host) {
    callback();
    return;
  }

  // fix hostname by redirect
  host = N.config.listen.host;
  if (N.config.listen.port && 80 !== N.config.listen.port) {
    host += ':' + N.config.listen.port;
  }

  // Don't use 301 redirect, because it locks browsers forever,
  // and can make troubles with adding new domains to project.
  // But add cache for 1 day as compensation.
  callback({ statusCode: 302,
    headers: {
      'Location':       'http://' + host,
      'Cache-Control':  'public, max-age=' + 60*60*24
    }
  });
});
