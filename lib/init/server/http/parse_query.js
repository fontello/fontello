'use strict';


// prepare connect middleware
var query = require('connect').query();


////////////////////////////////////////////////////////////////////////////////


module.exports = function parse_query(params, callback) {
  var http = this.origin.http, host;

  if (!http) {
    callback();
    return;
  }

  query(http.req, http.res, callback);
};
