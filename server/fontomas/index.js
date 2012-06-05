/*global nodeca*/


"use strict";


////////////////////////////////////////////////////////////////////////////////


function hash(str) {
  return require('crypto').createHash('md5').update(str).digest('hex');
}


////////////////////////////////////////////////////////////////////////////////


var started_at  = (new Date).toUTCString();
var etag        = hash('fontello-layout-' + started_at);


////////////////////////////////////////////////////////////////////////////////


module.exports = function app(params, callback) {
  if (!this.origin.http) {
    callback('HTTP only');
    return;
  }

  // set headers
  this.response.headers['Last-Modified']  = started_at;
  this.response.headers['ETag']           = etag;

  // set view to be rendered
  this.response.view = 'layout';

  // done
  callback();
};
