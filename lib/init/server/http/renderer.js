'use strict';


/*global nodeca, _*/


// stdlib
var zlib = require('zlib');


// nodeca
var HashTree = require('nlib').Support.HashTree;


// internals
var helpers = require('./renderer/helpers');


////////////////////////////////////////////////////////////////////////////////


function get_allowed_compression(req) {
  var accept = req.headers['accept-encoding'] || '';

  if ('*' === accept || 0 <= accept.indexOf('gzip')) {
    return 'gzip';
  }

  if (0 <= accept.indexOf('deflate')) {
    return 'deflate';
  }

  return false;
}


// small helper to run compressor
function compress(algo, source, callback, thisArg) {
  ('gzip' === algo ? zlib.gzip : zlib.deflate)(source, callback.bind(thisArg));
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function renderer(params, callback) {
  var view, http = this.origin.http, headers = this.response.headers, compression;

  if (!http) {
    // skip non-http requests
    callback();
    return;
  }

  //
  // Prepare variables
  //

  compression = get_allowed_compression(http.req);
  view        = HashTree.get(nodeca.runtime.views, this.response.view);

  //
  // View not found
  //

  if (!view) {
    callback('View ' + this.response.view + ' not found');
    return;
  }

  //
  // Mark for proxies, that we can return different content (plain & gzipped),
  // depending on specified (comma-separated) headers
  //

  headers['Vary'] = 'Accept-Encoding';

  //
  // 304 Not Modified
  //

  if (headers['ETag'] && headers['ETag'] === http.req.headers['if-none-match']) {
    // The one who sets `ETag` header must set also (by it's own):
    //  - `Last-Modified`
    //  - `Cache-Control`
    this.response.statusCode = 304;
    callback();
    return;
  }

  //
  // Set Content-Type and charset
  //

  headers['Content-Type'] = 'text/html; charset=UTF-8';

  //
  // If compression is allowed, set Content-Encoding
  //

  if (compression) {
    headers['Content-Encoding'] = compression;
  }

  //
  // HEAD requested - no need for real rendering
  //

  if ('HEAD' === http.req.method) {
    callback();
    return;
  }

  try {
    this.response.body = view(_.extend({}, helpers, this.response.data));
  } catch (err) {
    callback(err);
    return;
  }

  //
  // No compression (or it's useless) - continue
  //

  if (false === compression || 500 > Buffer.byteLength(this.response.body)) {
    callback();
    return;
  }

  //
  // Compress body
  //

  compress(compression, this.response.body, function (err, buffer) {
    this.response.body = buffer;
    callback(err);
  }, this);
};
