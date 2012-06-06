'use strict';


////////////////////////////////////////////////////////////////////////////////


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


module.exports = function cachable(params, callback) {
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
  // Notify that content must be revalidated, if cache control not set
  //

  if (!headers['Cache-Control']) {
    headers['Cache-Control'] = 'public, must-revalidate';
  }

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
