'use strict';


/*global nodeca, _*/


// nodeca
var HashTree = require('nlib').Support.HashTree;


// internals
var helpers = require('./renderer/helpers');


////////////////////////////////////////////////////////////////////////////////


// Filter middleware that renders view and required layout and sets
//
// - `response.headers` with approprite headers
// - `response.body` with rendered (and compressed if allowed) html
//
nodeca.filters.after('', { weight: 900 }, function renderer(params, callback) {
  var http    = this.origin.http,
      headers = this.response.headers,
      layout  = this.response.layout,
      viewsTree, locals;

  if (!http) {
    // skip non-http requests
    callback();
    return;
  }

  //
  // Prepare variables
  //

  viewsTree = nodeca.runtime.views;

  if (!nodeca.shared.common.getByPath(viewsTree, this.response.view)) {
    callback(new Error("View " + this.response.view + " not found"));
    return;
  }

  //
  // Set Content-Type and charset
  //

  headers['Content-Type'] = 'text/html; charset=UTF-8';

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
  // HEAD requested - no need for real rendering
  //

  if ('HEAD' === http.req.method) {
    callback();
    return;
  }

  try {
    locals = _.extend(this.response.data, helpers, this.helpers);
    this.response.body = nodeca.shared.common.render(viewsTree, this.response.view, layout, locals);
  } catch (err) {
    callback(err);
    return;
  }

  callback();
});
