// `client` section processor
//
//      .
//      |- /client/
//      |   |- <package>.js
//      |   `- ...
//      `- ...
//


'use strict';


/*global N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _             = require('underscore');
var apiTree       = require('nlib').ApiTree;
var async         = require('nlib').Vendor.Async;
var fstools       = require('nlib').Vendor.FsTools;
var safePropName  = require('nlib').Support.safePropName;
var findRequires  = require('find-requires');


// internal
var findPaths = require('./utils').findPaths;


////////////////////////////////////////////////////////////////////////////////


function Requisite(root) {
  this.requires = {};
  this.idx      = 1;
  this.root     = String(root || '').replace(/\/*$/, '/');
}


Requisite.prototype.process = function (source, pathname) {
  var
  self  = this,
  base  = path.dirname(pathname.toString()),
  files = findRequires(source, { raw: true }),
  o, p;

  while (files.length) {
    o = files.shift();

    if (!o.value) {
      return new Error("Cannot handle non-string required path: " + o.raw);
    }

    try {
      // replace @ with root
      p = String(o.value).replace(/^@\/*/, this.root);
      // try to resolve path relatively to pathname
      p = require.resolve(path.resolve(base, p));
    } catch (err) {
      throw new Error(err.message +
                      ' (require: ' + o.value + ') (in: ' + pathname + ')');
    }

    if (undefined === this.requires[p]) {
      this.requires[p] = { idx: this.idx++, source: null };
      // prevent from "cyclic" loops
      this.requires[p].source = this.process(fs.readFileSync(p, 'utf8'), p);
    }

    source = source.replace(o.value, this.requires[p].idx);
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
      'define(' + dep.idx + ', function (exports, module, require, define, modules) {',
      dep.source,
      '});'
    );
  });

  parts.push(
      'return require;',
    '}())'
  );

  return parts.join('\n');
};


function browserifyClient(outfile, config, callback) {
  var chunks = [];

  async.forEachSeries(config.lookup, function (options, next) {
    findPaths(options, function (err, pathnames) {
      var
      heads       = [],
      bodies      = [],
      exportsList = [],
      requisite   = new Requisite(options.appRoot);

      if (err) {
        next(err);
        return;
      }

      async.forEachSeries(pathnames, function (pathname, nextPath) {
        pathname.read(function (err, source) {
          var // [ '["foo"]', '["bar"]', '["baz"]' ]
          apiPathParts = pathname.api.split('.').map(safePropName);

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

          try {
            source = requisite.process(source, pathname);
          } catch (err) {
            nextPath(err);
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

          exportsList.push('this' + apiPathParts.join(''));

          nextPath();
        });
      }, function (err) {
        if (err) {
          next(err);
          return;
        }

        chunks.push([
          '(function () {',
          'var require = ' + requisite.bundle() + ';\n\n',
          _.uniq(heads.sort(), true).map(function (api) {
            return 'this' + api + ' = {};';
          }).join('\n') + '\n\n' + bodies.join('\n') + '\n\n',
          '_.map([' + exportsList.sort().join(',') + '], function (api) {',
          'if (api && _.isFunction(api.init)) { api.init(window, N); }',
          '});',
          '}.call(N.client));'
        ].join('\n'));

        next();
      });
    });
  }, function (err) {
    if (err) {
      callback(err);
      return;
    }

    fs.writeFile(outfile, chunks.join('\n\n'), 'utf8', callback);
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, config, callback) {
  async.forEachSeries(_.keys(config.packages), function (pkgName, next) {
    var
    clientConfig   = config.packages[pkgName].client,
    clientOutfile  = path.join(tmpdir, 'client', pkgName + '.js');

    if (!clientConfig) {
      next();
      return;
    }

    fstools.mkdir(path.dirname(clientOutfile), function (err) {
      if (err) {
        next(err);
        return;
      }

      browserifyClient(clientOutfile, clientConfig, next);
    });
  }, callback);
};
