/*global nodeca*/


"use strict";


////////////////////////////////////////////////////////////////////////////////


function hash(str) {
  return require('crypto').createHash('md5').update(str).digest('hex');
}


////////////////////////////////////////////////////////////////////////////////


// FIXME: this works for single-process model only.
//        switch to shared cache in future.
var etag = hash('fontello-layout-' + Date.now());


////////////////////////////////////////////////////////////////////////////////


module.exports = function app(params, callback) {
  if (!this.origin.http) {
    callback('HTTP only');
    return;
  }

  // set headers
  this.response.headers['ETag']           = etag;
  this.response.headers['Cache-Control']  = 'private, max-age=0, must-revalidate';

  // set view to be rendered
  this.response.view   = 'layout';
  this.response.layout = null;

  // done
  callback();
};
