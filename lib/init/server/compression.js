// Small helpers to determine whenever or not compression is allowed depending
// on request headers and small helper to compress data.


"use strict";


// stdlib
var zlib = require('zlib');


////////////////////////////////////////////////////////////////////////////////


// Returns whenever or not compression is allowed by client
//
// - `'gzip'` if GZip allowed
// - `'deflate'` if Deflate allowed
// - `false` otherwise
//
module.exports.is_allowed = function get_allowed_compression(req) {
  var accept = req.headers['accept-encoding'] || '';

  if ('*' === accept || 0 <= accept.indexOf('gzip')) {
    return 'gzip';
  }

  if (0 <= accept.indexOf('deflate')) {
    return 'deflate';
  }

  return false;
};


// small helper to run compressor
//
module.exports.process = function compress(algo, source, callback) {
  ('gzip' === algo ? zlib.gzip : zlib.deflate)(source, callback);
};
