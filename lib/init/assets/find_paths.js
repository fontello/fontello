'use strict';


// stdlib
var path = require('path');
var fs   = require('fs');


// 3rd-party
var fstools   = require('fs-tools');
var minimatch = require('minimatch');
var _         = require('underscore');


// internal
var apify = require('../../support').apify;
var prop  = require('../common').prop;


////////////////////////////////////////////////////////////////////////////////


function Pathname(apiPath, relativePath, absolutePath) {
  var extension = path.extname(absolutePath);

  prop(this, 'apiPath',       { value: apiPath });
  prop(this, 'relativePath',  { value: relativePath });
  prop(this, 'absolutePath',  { value: absolutePath });
  prop(this, 'extension',     { value: extension });

  prop(this, '__data__',      { value: null, writable: true });
}


Pathname.prototype.toString = function toString() {
  return this.absolutePath;
};


Pathname.prototype.readSync = function readSync(encoding, force) {
  if (!force && this.__data__) {
    return this.__data__;
  }

  this.__data__ = fs.readFileSync(this.absolutePath, encoding);

  return this.__data__;
};


////////////////////////////////////////////////////////////////////////////////


// returns function suitable for file matching
function toFilter(str) {
  if ('/' === str[0] && '/' === str.substr(-1)) {
    var re = new RegExp(str.substring(1, str.length - 1));
    return function (file) { return re.test(file); };
  }

  return minimatch.filter(str);
}


// returns function that checks whenever or not file (first argument)
// matches at least one of the patterns in the array. returns function
// that always returns onEmptyArray value if array is empty.
function listFilter(arr, onEmptyArray) {
  if (0 === arr.length) {
    return function () { return onEmptyArray; };
  }

  return function (file) {
    return _.any(arr, function (test) {
      return test(file);
    });
  };
}


// returns function that tells whenever or not file must be included
// into the resulting list of files
function compileMatcher(options) {
  var included = listFilter((options.include || []).map(toFilter), true);
  var excluded = listFilter((options.exclude || []).map(toFilter), false);

  return function (file) {
    return included(file) && !excluded(file);
  };
}


////////////////////////////////////////////////////////////////////////////////


//  findPaths(options, callback(err, pathnames)) -> Void
//
//  Finds matching pathnames within root, respecting includes/excludes patterns,
//  and executes callback with an array of mathcing pathnames in alphabetical
//  order.
//
//
//  ##### Options
//
//  - *root* (String)
//  - *include* (Array, Optional)
//  - *exclude* (Array, Optional)
//  - *apiPrefix* (String, Optional)
//
//
//  ##### Results
//
//  Each element of `paths` is an object with properties:
//
//  - *apiPath*
//  - *relativePath*
//  - *absolutePath*
//  - *extension*
//
module.exports.findPaths = function (options, callback) {
  var root        = path.resolve(options.root || '.');
  var api_prefix  = '';
  var pathnames   = [];
  var match       = compileMatcher(options);

  if (options.apiPrefix) {
    api_prefix = options.apiPrefix + '.';
  }

  fstools.find(root, function (file, stats, next) {
    var extension = path.extname(file);
    var api_path  = apify(file, root, extension);
    var relative  = file.substr(root.length).replace(/^\//, '');

    if (!match(relative)) {
      next();
      return;
    }

    pathnames.push(new Pathname(api_prefix + api_path, relative, file));
    next();
  }, function (err) {
    if (err) {
      callback(err);
      return;
    }

    // return pathnames sorted by apiPath
    callback(null, pathnames.sort(function (a, b) {
      return a.apiPath.localeCompare(b.apiPath);
    }));
  });
};
