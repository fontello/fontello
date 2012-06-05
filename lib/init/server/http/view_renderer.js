'use strict';


// nodeca
var HashTree = require('nlib').Support.HashTree;


// internals
var static_helpers = require('./view_renderer/helpers');


////////////////////////////////////////////////////////////////////////////////


module.exports = function view_renderer(params, callback) {
  var view;

  if (!this.origin.http) {
    // skip non-http requests
    callback();
    return;
  }

  view = HashTree.get(nodeca.runtime.views, this.response.view);

  if (!view) {
    callback('View ' + this.response.view + ' not found');
    return;
  }

  this.response.headers['Content-Type'] = 'text/html';

  if (this.skipViewRenderer) {
    // skip rendering was requested
    callback();
  }

  try {
    this.response.body = view.en(_.extend({}, static_helpers, this.response.data));
  } catch (err) {
    callback(err);
    return;
  }

  callback();
};
