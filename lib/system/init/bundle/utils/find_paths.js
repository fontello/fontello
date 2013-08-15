// Search files using bundle conditions (root, include, exclude).
//


'use strict';


var path    = require('path');
var _       = require('lodash');
var apify   = require('../../utils/apify');
var lstatCached = require('./lstat_cached');
var readdirCached = require('./readdir_cached');


////////////////////////////////////////////////////////////////////////////////


// Converts given search pattern to a corresponding regexp.
// Input string may be either a shell-like pettern, e.g. `client/**.js` or a
// regexp source, e.g. '/(^|\/|\\)_.*/'
//
function patternToRegexp(string) {
  string = String(string);

  if ('/' === string[0] && '/' === string.substr(-1)) {
    return new RegExp(string.substring(1, string.length - 1));
  }

  if (string.match(/^\*\.\w+$/)) {
    //  When "*.js" is given, assume everything but `.js` is an API path.
    //
    //    `*.js` -> `**.js`
    string = '**' + string.substr(1);
  } else if (-1 === string.indexOf('**')) {
    //  When `**` is not explicitly set, assume everything before pattern is
    //  an API path.
    //
    //  `i18n/*.js` -> `**i18n/*.js`
    string = '**' + string;
  }

  string = string.replace(/\./g, '\\.').replace(/\*+/g, function (m) {
    return ('*' === m) ? '[^\\\\/]*?' : '(.*?)';
  });

  return new RegExp('^' + string + '$');
}

function scanDir(root, iterator) {
  var stat;

  root = path.normalize(root);

  try {
    stat = lstatCached(root);
  } catch (err) {
    if ('ENOENT' === err.code) {
      return;
    }

    // rethrow
    throw err;
  }

  if (stat.isDirectory()) {
    readdirCached(root).forEach(function (file) {
      scanDir(path.join(root, file), iterator);
    });
    return;
  }

  iterator(root, stat);
}

// Return an array of files by absolute paths found within directories affected
// by the given include list.
//
function collectFiles(root, includeList) {
  var result = [];

  function collect(file) {
    if (_.contains(result, file)) {
      return;
    }

    var relativeFilePath = file.substr(root.length).replace(/^\/+/, '');

    if (_.any(includeList, function (pattern) {
      return patternToRegexp(pattern).test(relativeFilePath);
    })) {
      result.push(file);
    }
  }

  // If there are any regexps - collect all possible files from the given root.
  if (_.any(includeList, _.isRegExp) ||
      _.any(includeList, function (s) { return (/^\/.*?\/$/).test(s); })) {
    scanDir(root, collect);
    return result;
  }

  _.forEach(includeList, function (include) {
    var prefix = [];

    // Collect static prefix of the current path, i.e. nodes without '*', '**'
    _.forEach(include.split(/[\/\\]/), function (node) {
      if (!_.contains(node, '*')) {
        prefix.push(node);
      } else {
        return false; // break
      }
    });

    scanDir(path.resolve(root, prefix.join(path.sep)), collect);
  });

  return result;
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


//  findPaths(lookupConfig, iterator, thisArg) -> Array
//  - lookupConfig (Array | Object): Array of options objects or a single
//  options object.
//  - iterator (Function): Executes on each found file.
//  - thisArg (Mixed): Used as `this` object for `iterator`.
//
//  Finds matching paths within root, respecting includes/excludes patterns,
//  and returns an array of that paths in alphabetical order.
//
//  ##### Options
//
//  - *root* (String)
//  - *pkgName* (String)
//  - *main* (String, Optional)
//  - *include* (Array, Optional)
//  - *exclude* (Array, Optional)
//
module.exports = function findPaths(lookupConfig, iterator, thisArg) {
  var result = [];

  if (!_.isArray(lookupConfig)) {
    lookupConfig = [ lookupConfig ];
  }

  _.forEach(lookupConfig, function (options) {
    var root    = path.resolve(options.root || '.')
      , pkgName = options.pkgName;

    if (!pkgName) {
      throw new Error('findPaths: missed required `pkgName` parameter');
    }

    collectFiles(root, options.include).forEach(function (fsPath) {
      var relativeFilePath = fsPath.substr(root.length).replace(/^\/+/, '');

      if (options.main && patternToRegexp(options.main).test(relativeFilePath)) {
        // Skip main file.
        return;
      }

      if (_.any(options.exclude, function (pattern) {
        return patternToRegexp(pattern).test(relativeFilePath);
      })) {
        // Skip file if it matches the exclude list.
        return;
      }

      _.forEach(options.include, function (pattern) {
        var apiPath, match = patternToRegexp(pattern).exec(relativeFilePath);

        if (!match) {
          return; // try next regexp
        }

        apiPath = apify(match[1]);

        if (apiPath) {
          apiPath = pkgName + '.' + apiPath;
        } else {
          apiPath = pkgName;
        }

        result.push({ fsPath: fsPath, apiPath: deduplicateApiPath(apiPath) });
        return false; // break
      });
    });
  });

  result = result.sort(function (a, b) {
    return a.fsPath.localeCompare(b.fsPath);
  });

  if (iterator) {
    _.forEach(result, function (file) {
      iterator.call(thisArg, file.fsPath, file.apiPath);
    });
  }

  return result;
};
