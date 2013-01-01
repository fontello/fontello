'use strict';


/*global underscore*/


// stdlib
var path = require('path');


// 3rd-party
var _       = underscore;
var async   = require('async');
var fstools = require('fs-tools');


// internal
var Pathname  = require('./pathname');
var apify     = require('./apify');


////////////////////////////////////////////////////////////////////////////////


// returns function suitable for file matching
//
function toFilter(str) {
  str = String(str);

  if ('/' === str[0] && '/' === str.substr(-1)) {
    return new RegExp(str.substring(1, str.length - 1));
  }

  if (str.match(/^\*\.\w+$/)) {
    //  When "*.js" is given, assume everything but `.js` is an API path.
    //
    //    `*.js` -> `**.js`
    str = '**' + str.substr(1);
  } else if (-1 === str.indexOf('**')) {
    //  When `**` is not explicitly set, assume everything before pattern is
    //  an API path.
    //
    //  `i18n/*.js` -> `**i18n/*.js`
    str = '**' + str;
  }

  str = str.replace(/\./g, '\\.').replace(/\*+/g, function (m) {
    return '*' === m ? '[^/]*?' : '(.*?)';
  });

  return new RegExp('^' + str + '$');
}


// returns function that checks whenever or not file (first argument)
// matches at least one of the patterns in the array.
//
function listFilter(arr) {
  if (0 === arr.length) {
    return function () { return null; };
  }

  return function (file) {
    return _.chain(arr).map(function (test) {
      return test.exec(file);
    }).filter(Boolean).first().value();
  };
}


// returns flatten array of passed arguments with valueble elements only:
//
//    toArray(null, 1, ['bar', '']);
//    // -> [1, 'bar']
//
function toArray() {
  return _.chain(arguments).flatten().filter(Boolean).value();
}


// returns function that tells whenever or not file must be included
// into the resulting list of files
//
function compileMatcher(options) {
  var
  mainfile = options.main ? options.main.relative : null,
  included = listFilter(toArray(options.include).map(toFilter)),
  excluded = listFilter(toArray(options.exclude, mainfile).map(toFilter));

  return function (file) {
    var match = included(file);
    return (excluded(file) || !match) ? null : match[1];
  };
}


// Deduplicates apiPath
//
//    deduplicateApiPath('foo.bar.bar.moo'); // -> 'foo.bar.moo'
//    deduplicateApiPath('foo.bar.moo.moo'); // -> 'foo.bar.moo'
//
function deduplicateApiPath(apiPath) {
  return apiPath.split('.').reduce(function (memo, curr) {
    if (memo[memo.length - 1] !== curr) {
      memo.push(curr);
    }

    return memo;
  }, []).join('.');
}


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
//  - *pathname*
//  - *extname*
//
//  And provides syntax sugar:
//
//  - *require()*: returns result of `require(pathname);`
//
function findPaths(options, callback) {
  var
  root      = path.resolve(options.root || '.'),
  match     = compileMatcher(options),
  prefix    = '',
  pathnames = [];

  if (options.apiPrefix) {
    prefix = options.apiPrefix + '.';
  }

  fstools.walk(root, function (file, stats, next) {
    var
    relative  = file.substr(root.length).replace(/^\/+/, ''),
    matched   = match(relative);

    if (null !== matched) {
      pathnames.push(new Pathname(file, {
        apiPath:  deduplicateApiPath(prefix + apify(matched)),
        appRoot:  options.appRoot,
        pkgRoot:  options.root
      }));
    }

    next();
  }, function (err) {
    if (err) {
      callback(err);
      return;
    }

    // return pathnames sorted by absolutePath
    callback(null, pathnames.sort(function (a, b) {
      return a.pathname.localeCompare(b.pathname);
    }));
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (options, callback) {
  if (!Array.isArray(options)) {
    findPaths(options, callback);
    return;
  }

  async.map(options, findPaths, function (err, arr) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, _.flatten(arr).sort(function (a, b) {
      return a.pathname.localeCompare(b.pathname);
    }));
  });
};
