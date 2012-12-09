'use strict';


/*global N*/


// 3rd-party
var async = require('nlib').Vendor.Async;
var _     = require('underscore');


// internal
var findPaths = require('../../find_paths');


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
