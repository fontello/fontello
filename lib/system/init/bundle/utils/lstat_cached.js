'use strict';

var _       = require('lodash');
var fs      = require('fs');
var path    = require('path');

var lstat_cached = _.memoize(function(root) {
  return fs.lstatSync(root);
});

module.exports = function lStatCached(root) {
  return lstat_cached(path.resolve(root));
}