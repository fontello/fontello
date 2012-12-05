'use strict';


/*global N*/


// stdlib
var path = require('path');
var fs   = require('fs');


// 3rd-party
var fstools = require('nlib').Vendor.FsTools;
var async   = require('nlib').Vendor.Async;
var apify   = require('nlib').Support.apify;
var _       = require('underscore');


////////////////////////////////////////////////////////////////////////////////


// shorthand for defining data descriptors
function prop(obj, name, value, options) {
  var descriptor = _.extend({}, options, {value: value});
  Object.defineProperty(obj, name, descriptor);
}


function Pathname(pathname, options) {
  prop(this, 'pathname',  String(pathname));
  prop(this, 'extension', path.extname(this.pathname));

  _.extend(this, options);
}


Pathname.prototype.toString = function toString() {
  return this.pathname;
};


Pathname.prototype.require = function () {
  return require(this.pathname);
};


////////////////////////////////////////////////////////////////////////////////


// returns function suitable for file matching
//
function toFilter(str) {
  if ('/' === str[0] && '/' === str.substr(-1)) {
    var re = new RegExp(str.substring(1, str.length - 1));
    return function (file) { return re.test(file); };
  }

  str = str.replace(/^\*{2}/, '').replace('.', '\\.').replace('*', '.*?');
  return new RegExp('^(.*?)' + str + '$');
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
  var
  included = listFilter(toArray(options.include).map(toFilter)),
  excluded = listFilter(toArray(options.exclude).map(toFilter));

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
function deduplicateApiPath(api) {
  return api.split('.').reduce(function (memo, curr) {
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
//
//
//  ##### Results
//
//  Each element of `paths` is an object with properties:
//
//  - *pathname*
//  - *extension*
//
//  And provides syntax sugar:
//
//  - *require()*: returns result of `require(pathname);`
//
function findPaths(options, callback) {
  var
  root      = path.resolve(options.root || '.'),
  match     = compileMatcher(options),
  pathnames = [];


  fstools.walk(root, function (file, stats, next) {
    var
    relative  = file.substr(root.length).replace(/^\/+/, ''),
    matched   = match(relative);

    if (matched) {
      pathnames.push(new Pathname(file, {
        api: deduplicateApiPath(apify(matched))
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


function collect(options, callback) {
  findPaths(options, function (err, pathnames) {
    var translations = {};

    if (err) {
      callback(err);
      return;
    }

    async.forEachSeries(pathnames, function (pathname, next) {
      var data;

      try {
        data = pathname.require();
      } catch (err) {
        next(new Error('Failed read ' + pathname + ':\n' +
                       (err.stack || err.message || err)));
        return;
      }

      _.each(data, function (phrases, locale) {
        if (!translations[locale]) {
          translations[locale] = {};
        }

        translations[locale][pathname.api] = phrases;
      });

      next();
    }, function (err) {
      callback(err, translations);
    });
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports.collect = collect;
