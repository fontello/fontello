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


// internal
var findPaths = require('./utils').findPaths;
var stopWatch = require('./utils').stopWatch;
var Requisite = require('./client/requisite');


////////////////////////////////////////////////////////////////////////////////


function browserifyClient(outfile, config, callback) {
  var chunks = [];

  async.forEachSeries(config.lookup, function (options, next) {
    findPaths(options, function (err, pathnames) {
      var
      heads       = [],
      bodies      = [],
      exportsList = [],
      requisite   = new Requisite();

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
              ('function t(phrase, params) {'),
                ('if (0 === phrase.indexOf(".")) {'),
                  ('phrase = phrase.substr(1);'),
                ('} else {'),
                  ('phrase = ' + JSON.stringify(pathname.api) + ' + "." + phrase;'),
                ('}'),
                ('return N.runtime.t(phrase, params);'),
              ('}'),
              ('(function (exports, module, t) {'),
              source,
              ('}.call(this.exports, this.exports, this, t));'),
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
  var timer = stopWatch();

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
  }, function (err) {
    N.logger.info('Processed client section ' + timer.elapsed);
    callback(err);
  });
};
