// Concats js/css resources per-package
//


'use strict';


/*global underscore, N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _       = underscore;
var async   = require('async');
var fstools = require('fs-tools');


// internal
var stopwatch = require('../utils/stopwatch');


////////////////////////////////////////////////////////////////////////////////


function concatJavascripts(pkgName, tmpdir, sandbox, callback) {
  var base = '';

  async.forEachSeries([ 'server', 'views', 'client' ], function (part, next) {
    var filename = path.join(tmpdir, part, pkgName + '.js');

    fs.exists(filename, function (exists) {
      if (!exists) {
        next();
        return;
      }

      fs.readFile(filename, 'utf8', function (err, str) {
        if (err) {
          next(err);
          return;
        }

        base += str;
        next();
      });
    });
  }, function (err) {
    if (err) {
      callback(err);
      return;
    }
    
    async.forEachSeries(N.config.locales['enabled'], function (locale, next) {
      var
      filename  = path.join(tmpdir, 'i18n', pkgName, locale + '.js'),
      outfile   = path.join(tmpdir, 'bundle', pkgName + '.' + locale + '.js');

      // ask manifest to compile package bundle
      sandbox.assets.files.push(outfile);

      fs.exists(filename, function (exists) {
        if (!exists) {
          fs.writeFile(outfile, base, 'utf8', next);
          return;
        }

        fs.readFile(filename, 'utf8', function (err, str) {
          if (err) {
            next(err);
            return;
          }

          fs.writeFile(outfile, base + str, 'utf8', next);
        });
      });
    }, callback);
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, sandbox, callback) {
  var
  pkgNames  = _.keys(sandbox.config.packages),
  timer     = stopwatch();

  fstools.mkdir(path.join(tmpdir, 'bundle'), function (err) {
    if (err) {
      callback(err);
      return;
    }

    async.forEachSeries(pkgNames, function (pkgName, next) {
      concatJavascripts(pkgName, tmpdir, sandbox, next);
    }, function (err) {
      N.logger.debug('Concatenated dynamic assets ' + timer.elapsed);
      callback(err);
    });
  });
};
