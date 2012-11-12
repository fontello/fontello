'use strict';


// stdlib
var path = require('path');
var fs   = require('fs');


// 3rd-party
var fstools   = require('nlib').Vendor.FsTools;
var minimatch = require('minimatch');
var _         = require('underscore');


// internal
var apify = require('nlib').Support.apify;


////////////////////////////////////////////////////////////////////////////////


// shorthand for defining data descriptors
function prop(obj, name, value, options) {
  var descriptor = _.extend({}, options, {value: value});
  Object.defineProperty(obj, name, descriptor);
}


function Pathname(apiPath, relativePath, absolutePath) {
  var extension = path.extname(absolutePath);

  prop(this, 'apiPath',       apiPath);
  prop(this, 'relativePath',  relativePath);
  prop(this, 'absolutePath',  absolutePath);
  prop(this, 'extension',     extension);
}


Pathname.prototype.toString = function toString() {
  return this.absolutePath;
};


Pathname.prototype.read = function read(encoding, callback) {
  if (!callback) {
    callback = encoding;
    encoding = null;
  }

  fs.readFile(this.absolutePath, encoding, callback);
};


////////////////////////////////////////////////////////////////////////////////


// returns function suitable for file matching
//
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
//
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


// - returns obj if obj is an array
// - returns empty array if obj is falsy (empty string, null, etc)
// - returns array with the only element as `obj` iteslf
//
function toArray(obj) {
  if (Array.isArray(obj)) {
    return obj;
  }

  return !!obj ? [obj] : [];
}


// returns function that tells whenever or not file must be included
// into the resulting list of files
//
function compileMatcher(options) {
  var included = listFilter(toArray(options.include).map(toFilter), true);
  var excluded = listFilter(toArray(options.exclude).map(toFilter), false);

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
module.exports = function findPaths(options, callback) {
  var root        = path.resolve(options.root || '.');
  var api_prefix  = '';
  var pathnames   = [];
  var match       = compileMatcher(options);

  if (options.apiPrefix) {
    api_prefix = options.apiPrefix + '.';
  }

  fstools.walk(root, function (file, stats, next) {
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
