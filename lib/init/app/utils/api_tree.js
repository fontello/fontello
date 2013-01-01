/**
 *  ApiTree
 *
 *  A collection of tools to browserify server/shared/client trees.
 **/


/*global underscore*/


'use strict';


// stdlib
var fs = require('fs');


// 3rd-party
var _         = underscore;
var async     = require('async');
var fstools   = require('fs-tools');


// internal
var apify         = require('./apify');
var safePropName  = require('./safe_prop_name');


////////////////////////////////////////////////////////////////////////////////


// internal
// collect(pathnames, callback(err, map)) -> Void
// - pathnames (Array): List of pathnames where to find JS files.
// - callback (Function): Executed once everything is done.
//
// Collect files from all `pathanmes` and build a map of `api -> str` pairs.
//
function collect(pathnames, callback) {
  var map = {};

  async.forEach(pathnames, function (pathname, nextPath) {
    fs.exists(pathname, function (exists) {
      if (!exists) {
        nextPath();
        return;
      }

      fstools.walk(pathname, /[.]js$/, function (file, lstats, nextFile) {
        fs.readFile(file, 'utf8', function (err, str) {
          if (err) {
            nextFile(err);
            return;
          }

          map[apify(file, pathname)] = str;
          nextFile();
        });
      }, nextPath);
    });
  }, function (err) {
    callback(err, map);
  });
}


/**
 *  ApiTree.browserifySources(pathnames, namespace, callback(err, str)) -> Void
 *  - pathnames (String|Array): Pathname(s) where to find JS files.
 *  - namespace (String): Global object used as container for the tree.
 *  - callback (Function): Executed once everything is done.
 *
 *  Generates a browserified function that will create api tree and will
 *  inject it into the `namespace`.
 *
 *
 *  ##### Example
 *
 *      var pathnames = ['/path/to/app1/client', '/path/to/app2/client'];
 *      browserifySources(pathnames, 'this.client', function (err, str) {
 *        // ...
 *        fs.writeFile('/path/to/my-app/public/api-client.js', str);
 *        // ...
 *      });
 **/
function browserifySources(pathnames, namespace, callback) {
  pathnames = _.isArray(pathnames) ? pathnames : [pathnames];

  collect(pathnames, function (err, sources) {
    var keys = _.keys(sources), head = [], body = [];

    if (err) {
      callback(err);
      return;
    }

    //
    // generate structure needed to build the tree
    //

    keys.forEach(function (api) {
      var parts = api.split('.').map(safePropName);

      // the last element is the function itself, so skip it
      parts.pop();

      while (parts.length) {
        head.push('this' + parts.join(''));
        parts.pop();
      }
    });

    head = _.uniq(head.sort(), true).map(function (ns) {
      return 'if (!' + ns + ') { ' + ns + ' = {}; }';
    });

    //
    // generate tree population with functions
    //

    keys.sort().forEach(function (api) {
      body.push('this' + api.split('.').map(safePropName).join('') +
                ' = (function () { "use strict";\n' +
                '(function (exports, module) {\n' +
                sources[api] +
                '}.call(this.exports, this.exports, this));\n' +
                'return this.exports;\n' +
                '}.call({exports: {}}));');
    });

    //
    // Return tree populator
    //

    callback(null,
             '(function () {\n' +
             head.join('\n') + '\n' + body.join('\n') +
             '\n}.call(' + namespace + ' || (' + namespace + ' = {})));');
  });
}


/**
 *  ApiTree.browserifyServerTree(obj[, namespace = 'this.server'[, options = {}]]) -> String
 *  - pathnames (Array): List of pathnames where to find JS files.
 *  - namespace (String): Global object used as container for the tree.
 *  - options (Object): Generator options (See below)
 *
 *  Generates a browserified function that will create api tree and will inject
 *  it into the `namespace`. Each generated method node will become a wrapper
 *  for corresponding server API tree method.
 *
 *
 *  ##### Options
 *
 *  - *prefix* (String): Prefix of server method wrappers. Useful when you
 *    generate a tree with offset, e.g. `'server.admin'`.
 *    Default: `''`.
 *
 *  - *method* (String): rpc function used to make an api tree call internally.
 *    This function must have signature with four arguments in an order:
 *    `apiPath`, `params`, `options`, `callback`.
 *
 *
 *  ##### Example
 *
 *      var output = browserifyServerTree(N.server);
 *      fs.writeFile('/path/to/my-app/public/api-server.js', output);
 **/
function browserifyServerTree(obj, namespace, options) {
  var head = [], body = [], keys, prefix, method;

  options = options || {};
  prefix  = !options.prefix ? [] : [options.prefix];
  method  = options.method || 'apiTreeRPC';

  //
  // collect only `leaf` paths.
  // each `this.path` is an array of strings representing api path:
  // `foo.bar` -> ['foo', 'bar']
  //

  keys = Object.keys(obj).filter(function (key) {
    return _.isFunction(obj[key]);
  }).sort().map(function (key) {
    return key.split('.');
  });

  //
  // generate structure needed to build the tree
  //

  keys.forEach(function (api) {
    var parts = api.map(safePropName);

    // the last element is the function itself, so skip it
    parts.pop();

    while (parts.length) {
      head.push('this' + parts.join(''));
      parts.pop();
    }
  });

  head = _.uniq(head.sort(), true).map(function (ns) {
    return 'if (!' + ns + ') { ' + ns + ' = {}; }';
  });

  //
  // generate tree population with functions
  //

  keys.forEach(function (api) {
    var path = JSON.stringify(prefix.concat(api).join('.'));
    body.push('this' + api.map(safePropName).join('') + ' = ' +
              'function (params, opts, cb) { ' + method + '(' +
              path + ', params, opts, cb); ' + '};');
  });

  //
  // Return tree populator
  //

  return  '(function () {\n' +
          head.join('\n') + '\n' + body.join('\n') +
          '\n}.call(' + namespace + ' || (' + namespace + ' = {})));';
}


////////////////////////////////////////////////////////////////////////////////


module.exports.browserifySources    = browserifySources;
module.exports.browserifyServerTree = browserifyServerTree;
