// shared constants, variabes and functions for font:
// - generate()
// - status()
// - download()


'use strict';


// stdlib
var path = require('path');


////////////////////////////////////////////////////////////////////////////////


exports.APP_ROOT            = N.runtime.mainApp.root;
exports.DOWNLOAD_DIR        = path.join(exports.APP_ROOT, 'public/download/');
exports.DOWNLOAD_URL_PREFIX = "/download/";
exports.JOBS                = {};


////////////////////////////////////////////////////////////////////////////////


exports.getDownloadPath = function getDownloadPath(font_id) {
  var a, b;

  a = font_id.substr(0, 2);
  b = font_id.substr(2, 2);

  return [a, b, 'fontello-' + font_id].join("/") + ".zip";
};


exports.getDownloadUrl = function getDownloadUrl(font_id) {
  return exports.DOWNLOAD_URL_PREFIX + exports.getDownloadPath(font_id);
};
