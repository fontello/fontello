'use strict';


/*global N, _*/


// 3rd-party
var async = require('nlib').Vendor.Async;
var apify = require('nlib').Support.apify;


// internal
var findPaths = require('../find_paths');


////////////////////////////////////////////////////////////////////////////////


function collect(options, callback) {
  findPaths(options, function (err, pathnames) {
    var translations = {};

    if (err) {
      callback(err);
      return;
    }

    async.forEachSeries(pathnames, function (pathname, next) {
      var api, data;

      try {
        api   = apify(pathname.relativePath, '', /\/i18n\/.*?\.yml$/);
        data  = require(pathname.absolutePath);
      } catch (err) {
        next(new Error('Failed read ' + pathname.absolutePath + ':\n' +
                       (err.stack || err.message || err)));
        return;
      }

      _.each(data, function (phrases, locale) {
        if (!translations[locale]) {
          translations[locale] = {};
        }

        translations[locale][api] = phrases;
      });

      next();
    }, function (err) {
      callback(err, translations);
    });
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports.collect = collect;
