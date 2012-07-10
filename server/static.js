"use strict";


/*global nodeca, _*/


// stdlib
var path = require('path');


// 3rd-party
var connect = require('connect');


////////////////////////////////////////////////////////////////////////////////


var static_options = {root: path.join(nodeca.runtime.apps[0].root, 'public/root')};
module.exports = function (params, callback) {
  var http = this.origin.http;

  if (!http) {
    callback("HTTP requests only");
    return;
  }

  static_options.path    = params.file;
  static_options.getOnly = true;

  connect.static.send(http.req, http.res, function (err) {
    var prefix = '[server.static] (' + http.req.url + ')';

    if (err && err.code) {
      callback(prefix + 'File not found');
      return;
    }

    if (err) {
      callback(prefix + 'Unexpected error: ' + (err.stack || err));
      return;
    }

    callback(prefix + 'Generic error');
  }, static_options);
}
