'use strict';


var _       = require('lodash');
var fs      = require('fs');
var path    = require('path');


var readdir_cached = _.memoize(function(dirPath) {
  return fs.readdirSync(dirPath);
});

module.exports.readdirSync = function readdirSync(dirPath) {
  return readdir_cached(path.resolve(dirPath));
};


var stat_cached = _.memoize(function(filePath) {
  return fs.statSync(filePath);
});

module.exports.statSync = function statSync(filePath) {
  return stat_cached(path.resolve(filePath));
};
