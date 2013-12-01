// gzip/deflate response
// Should stait just prior to send

'use strict';


// stdlib
var zlib = require('zlib');


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

function compress(algo, source, callback) {
  ('gzip' === algo ? zlib.gzip : zlib.deflate)(source, callback);
}


////////////////////////////////////////////////////////////////////////////////

module.exports = function (N) {

  N.wire.after(['responder:http', 'responder:rpc'], { priority: 95 }, function body_compress(env, callback) {
    var type, compressor
      , headers = env.headers
      , body = env.body;

    //
    // Check whenever compression is allowed by client or not
    //

    type = headers['Content-Type'] || env.origin.res.getHeader('Content-Type');
    compressor = /json|text|javascript/.test(type) && get_allowed_compression(env.origin.req);

    //
    // Mark for proxies, that we can return different content (plain & gzipped),
    // depending on specified (comma-separated) headers
    //

    headers.Vary = 'Accept-Encoding';

    //
    // Return raw response, if compression is not allowed or body is too small
    //

    if (false === compressor || 500 > Buffer.byteLength(body || '')) {
      callback();
      return;
    }

    //
    // Compression is allowed, set Content-Encoding
    //

    headers['Content-Encoding'] = compressor;

    //
    // Compress body
    //

    compress(compressor, body, function (err, buffer) {
      // on fuckup just leave body intact,
      // but error should never happen
      if (!err) {
        env.body = buffer;
      }

      callback();
      return;
    });
  });
};
