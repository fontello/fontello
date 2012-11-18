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
var findRequires  = require('find-requires');


// internal
var findPaths = require('./find_paths');


////////////////////////////////////////////////////////////////////////////////


function Requisite() {
  this.requires = {};
  this.idx      = 1;
}


Requisite.prototype.process = function (source, pathname) {
  var
  self  = this,
  files = findRequires(source, { raw: true }),
  dependency, o, p;

  while (files.length) {
    o = files.shift();

    if (!o.value) {
      return new Error("Cannot handle non-string required path: " + o.raw);
    }

    try {
      p = require.resolve(path.resolve(path.dirname(pathname.toString()), o.value));
    } catch (err) {
      return new Error(err.message +
                       ' (require: ' + o.value + ') (in: ' + pathname + ')');
    }

    dependency = this.requires[p];

    if (undefined === dependency) {
      this.requires[p] = { idx: this.idx++, source: null };
      // prevent from "cyclic" loops
      this.requires[p].source = this.process(fs.readFileSync(p, 'utf8'), p);
    }

    source = source.replace(o.value, dependency.idx);
  }

  return source;
};


Requisite.prototype.bundle = function () {
  var parts = [];

  parts.push(
    '(function () {',
      'var modules = {};',
      'function define(name, init) {',
        'modules[name] = { init: init };',
      '}',
      'function require(name) {',
        'if (!modules[name]) { throw new Error("Unknown module " + name); }',
        'if (!modules[name].module) {',
          'modules[name].module = { exports: {} };',
          'modules[name].init.call(modules[name].module.exports, ',
            'modules[name].module.exports, modules[name].module, ',
            'require);',
        '}',
        'return modules[name].module.exports;',
      '}'
  );

  _.each(this.requires, function (dep, pathname) {
    parts.push(
      'define("' + dep.idx + '", function (exports, module, require, define, modules) {',
      dep.source,
      '});'
    );
  });

  parts.push(
      'return require;',
    '})'
  );

  return parts.join('\n');
};


// produces bundled server/client (js) trees for the browswers
function browserifyClient(callback) {
  var
  bundleConfig  = require('../../../bundle.yml'),
  packageConfig = bundleConfig.packages.fontello,
  clientConfig  = packageConfig.client,
  clientRoot    = path.resolve(nodeca.runtime.apps[0].root, clientConfig.root),
  findOptions   = _.pick(clientConfig, 'include', 'exclude');

  findOptions.root = clientRoot;

  findPaths(findOptions, function (err, pathnames) {
    var heads = [], bodies = [], requisite = new Requisite();

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

        source = requisite.process(source, pathname);

        if (source instanceof Error) {
          nextPath(source);
          return;
        }

        bodies.push(
          ('this' + apiPathParts.join('') + ' = (function (require) {'),
            ('(function (exports, module) {'),
            source,
            ('}.call(this.exports, this.exports, this));'),
            ('return this.exports;'),
          ('}.call({ exports: {} }, require));')
        );

        nextPath();
      });
    }, function (err) {
      var head = _.uniq(heads.sort(), true).map(function (api) {
        return 'this' + api + ' = {};';
      }).join('\n');

      callback(err, [
        '(function () {',
        'var require = ' + requisite.bundle() + ';\n\n',
        head + '\n\n' + bodies.join('\n'),
        '}.call(nodeca.client));'
      ].join('\n'));
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
  browserifyClient(function (err, client) {
    var server;

    if (err) {
      callback(err);
      return;
    }

    server = apiTree.browserifyServerTree(nodeca.server, 'this.nodeca.server', {
      method: 'nodeca.io.apiTree'
    });

    fs.writeFile(path.join(root, 'api.js'), server + '\n\n' + client, callback);
  });
};
