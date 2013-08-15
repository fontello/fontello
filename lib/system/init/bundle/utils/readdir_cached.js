'use strict';

var _       = require('lodash');
var fs      = require('fs');
var path    = require('path');

var readdir_cached = _.memoize(function(root) {
  return fs.readdirSync(root);
});

module.exports = function (root) {
  return readdir_cached(path.resolve(root));
};