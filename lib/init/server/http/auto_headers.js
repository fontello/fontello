'use strict';


////////////////////////////////////////////////////////////////////////////////


function set_default(headers, key, val) {
  if (!headers[key]) {
    headers[key] = val;
  }
}


function not_modified(env) {
  var req_mtime, res_mtime;

  //
  // Check if response's etag matches `if-none-match` header.
  //

  if (env.origin.http.req.headers['if-none-match']) {
    return env.response.headers['ETag'] === env.origin.http.req.headers['if-none-match'];
  }

  //
  // Check modification time ONLY when `if-none-match` was not presented:
  // http://stackoverflow.com/questions/2021882/is-my-implementation-of-http-conditional-get-answers-in-php-is-ok/2049723#2049723
  //

  req_mtime = Date.parse(env.origin.http.req.headers['if-modified-since']);
  res_mtime = Date.parse(env.response.headers['Last-Modified']);

  // can't parse one of headers mtime (not set in normal situation)
  if (isNaN(req_mtime) || isNaN(res_mtime)) {
    return false;
  }

  // if-modified-since >= Last-Modified
  return req_mtime >= res_mtime;
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function auto_headers(params, callback) {
  var headers;

  if (!this.origin.http) {
    // skip non-http requests
    callback();
    return;
  }

  //
  // Make sure we have a hash of headers
  //

  headers = this.response.headers || (this.response.headers = {});

  //
  // Mark for proxies, that we can return different content (plain & gzipped),
  // depending on specified (comma-separated) headers
  //

  // TODO: Move to separate (gzip/deflate) middleware
  //       Beware (!) middeware should be placed (!) after renderer, but if
  //       contatne was not modified, then rederer will not be triggered, thus
  //       we need to keep a cache of "gzipped/deflated" things
  set_default(headers, 'Vary', 'Accept-Encoding');

  //
  // Notify that content must be revalidated, if cache control not set
  //

  set_default(headers, 'Cache-Control', 'public, must-revalidate');

  //
  // Check whenever response should be marked as not modified or not
  //

  if (not_modified(this)) {
    this.response.statusCode  = 304;
    this.skipViewRenderer     = true;
  }

  //
  // Done with setting headers
  //

  callback();
};
