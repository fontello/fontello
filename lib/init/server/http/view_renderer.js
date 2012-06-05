'use strict';


// nodeca
var HashTree = require('nlib').Support.HashTree;


// internals
var static_helpers = require('./view_renderer/helpers');


////////////////////////////////////////////////////////////////////////////////


module.exports = function view_renderer(params, callback) {
  var data, view;

  if (!this.origin.http || this.skipViewRenderer) {
    // skip non-http requests or when skip rendering was requested
    callback();
    return;
  }

  view = HashTree.get(nodeca.runtime.views, this.response.view);
  data = _.extend({}, static_helpers, this.response.data);

  if (!view) {
    callback('View ' + this.response.view + ' not found');
    return;
  }

  try {
    this.response.headers['Content-Type'] = 'text/html';
    this.response.body = view.en(data);
  } catch (err) {
    callback(err);
    return;
  }

  callback();
};
