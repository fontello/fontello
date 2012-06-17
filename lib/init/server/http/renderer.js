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


function get_layouts_stack(theme, layout) {
  var stack = [],
      func;

  // we might want to disable layout at all
  if (layout) {
    // using native functions to reduce overhead
    layout.split('.').reduce(function (memo, part) {
      memo.push(part);

      func = HashTree.get(theme, memo.join('.'));

      if (!!func) {
        stack.push(func);
        return memo;
      }

      nodeca.logger.error("Layout " + memo.slice(1).join('.') + " not found");
      return memo;
    }, ['layouts']);
  }

  return stack;
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function renderer(params, callback) {
  var view,
      http      = this.origin.http,
      headers   = this.response.headers,
      theme_id  = this.session.theme || 'desktop',
      theme     = nodeca.runtime.views[this.session.locale][theme_id],
      layouts, locals, compression;

  if (!http) {
    // skip non-http requests
    callback();
    return;
  }

  //
  // Theme is essential and should exist
  //

  if (!theme) {
    callback("Theme '" + theme_id + "' not found");
    return;
  }

  //
  // Prepare variables
  //

  compression = get_allowed_compression(http.req);
  view        = HashTree.get(theme, this.response.view);
  layouts     = get_layouts_stack(theme, this.response.layout);

  //
  // View not found
  //

  if (!_.isFunction(view)) {
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
    locals = _.extend(this.response.data, helpers, {t: this.t.bind(this)});
    this.response.body = view(locals);

    while (layouts.length) {
      locals.content = this.response.body;
      this.response.body = layouts.pop()(locals);
    }
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
