'use strict';


////////////////////////////////////////////////////////////////////////////////


module.exports = function compressable(params, callback) {
  if (!this.origin.http) {
    // skip non-http requests
    callback();
    return;
  }

  //
  // Mark for proxies, that we can return different content (plain & gzipped),
  // depending on specified (comma-separated) headers
  //

  if (!this.response.headers['Vary']) {
    this.response.headers['Vary'] = 'Accept-Encoding';
  } else if (-1 === this.response.headers['Vary'].indexOf('Accept-Encoding')) {
    // append Accept-Encoding to the Vary list
    this.response.headers['Vary'] += ',Accept-Encoding';
  }


  // TODO: GZipping/Deflating goes here...


  //
  // Done with setting headers
  //

  callback();
};
