"use strict";


/*global nodeca, _*/


// stdlib
var path = require('path');


// 3rd-party
var connect = require('connect');


////////////////////////////////////////////////////////////////////////////////


var static_options = {
  root: path.join(nodeca.runtime.apps[0].root, 'public/root')
};


////////////////////////////////////////////////////////////////////////////////


module.exports = function (params, callback) {
  var http = this.origin.http;

  if (!http) {
    callback("HTTP requests only");
    return;
  }

  static_options.path    = params.file;
  static_options.getOnly = true;

  connect.static.send(http.req, http.res, function (err) {
    var prefix = '[server.static] ',
        suffix = ' (' + http.req.url + ')';

    if (err) {
      callback(prefix + (err.message || err) + suffix +
               (err.stack ? ('\n' + err.stack) : ''));
      return;
    }

    callback(prefix + 'File not found' + suffix);
  }, static_options);
};
