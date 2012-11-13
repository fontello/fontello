'use strict';


/*global nodeca, _*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var apiTree       = require('nlib').ApiTree;
var async         = require('nlib').Vendor.Async;
var fstools       = require('nlib').Vendor.FsTools;
var safePropName  = require('nlib').Support.safePropName;


// internal
var findPaths = require('./find_paths');


////////////////////////////////////////////////////////////////////////////////


function browserifyClient(callback) {
  var
  bundleConfig  = require('../../../bundle.yml'),
  packageConfig = bundleConfig.packages.fontello,
  clientConfig  = packageConfig.client,
  clientRoot    = path.resolve(nodeca.runtime.apps[0].root, clientConfig.root),
  findOptions   = _.pick(clientConfig, 'include', 'exclude');

  findOptions.root = clientRoot;

  findPaths(findOptions, function (err, pathnames) {
    var heads = [], bodies = [];

    if (err) {
      callback(err);
      return;
    }

    async.forEachSeries(pathnames, function (pathname, nextPath) {
      pathname.read('utf8', function (err, source) {
        var // [ '["foo"]', '["bar"]', '["baz"]' ]
        apiPathParts = pathname.apiPath.split('.').map(safePropName);

        if (err) {
          nextPath(err);
          return;
        }

        // feed all parents of apiPath into heads array
        apiPathParts.reduce(function (prev, curr) {
          if (-1 === heads.indexOf(prev)) {
            heads.push(prev);
          }

          return prev + curr;
        });

        bodies.push(
          ('this' + apiPathParts.join('') + ' = (function () {'),
            ('(function (exports, module) {'),
            source,
            ('}.call(this.exports, this.exports, this));'),
            ('return this.exports;'),
          ('}.call({ exports: {} }));')
        );

        nextPath();
      });
    }, function (err) {
      var head = _.uniq(heads.sort(), true).map(function (api) {
        return 'this' + api + ' = {};';
      }).join('\n');

      callback(err, '(function () {\n' +
        head + '\n\n' + bodies.join('\n') +
        '\n}.call(nodeca.client));'
      );
    });
  });
}


////////////////////////////////////////////////////////////////////////////////


// internal
// browserify(callback(err, str)) -> Void
// - callback (Function): Executed once all namespaces were browserified
//
// Makes browserified client/shared/server trees.
//
function browserify(callback) {
  var parts = [];

  // browserify server tree
  parts.push(apiTree.browserifyServerTree(nodeca.server, 'this.nodeca.server', {
    method: 'nodeca.io.apiTree'
  }));

  browserifyClient(function (err, str) {
    var sharedPathname = path.join(nodeca.runtime.apps[0].root, 'shared');

    if (err) {
      callback(err);
      return;
    }

    parts.push(str);

    apiTree.browserifySources(sharedPathname, 'this.nodeca.shared', function (err, str) {
      if (err) {
        callback(err);
        return;
      }

      parts.push(str);

      callback(null, parts.join('\n\n'));
    });
  });
}


////////////////////////////////////////////////////////////////////////////////


// buildApiTree(root, callback(err)) -> Void
// - root (String): Pathname where to save browserified api.js.
// - callback (Function): Executed once everything is done.
//
// Browserifies server/shared/client trees into api.js file.
//
module.exports = function buildApiTree(root, callback) {
  browserify(function (err, str) {
    if (err) {
      callback(err);
      return;
    }

    fs.writeFile(path.join(root, 'api.js'), str, callback);
  });
};
