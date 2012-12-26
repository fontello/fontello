/*global underscore, N*/


"use strict";


// stdlib
var path = require('path');


// internal
var DOWNLOAD_DIR    = require('./_common').DOWNLOAD_DIR;
var JOBS            = require('./_common').JOBS;
var getDownloadUrl  = require('./_common').getDownloadUrl;
var getDownloadPath = require('./_common').getDownloadPath;


////////////////////////////////////////////////////////////////////////////////


// Validate input parameters
N.validate({
  id: {
    type: "string",
    required: true
  }
});


////////////////////////////////////////////////////////////////////////////////


// request font generation status
module.exports = function (params, callback) {
  var response  = this.response,
      file      = path.join(DOWNLOAD_DIR, getDownloadPath(params.id));

  if (JOBS[params.id]) {
    response.data = {status: 'enqueued'};
    callback();
    return;
  }

  path.exists(file, function (exists) {
    if (!exists) {
      // job not found
      response.data   = {status: 'error'};
      response.error  = 'Unknown font id (probably task crashed, try again).';
      callback();
      return;
    }

    // job done
    response.data = {status: 'finished', url: getDownloadUrl(params.id)};
    callback();
  });
};
