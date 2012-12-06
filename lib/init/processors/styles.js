'use strict';


/*global N*/


// 3rd-party
var async = require('nlib').Vendor.Async;


// internal
var findPaths = require('../../find_paths');


////////////////////////////////////////////////////////////////////////////////


var RENDERER = { '.styl': require('./styles/stylus') };


////////////////////////////////////////////////////////////////////////////////


function compile(options, callback) {
  findPaths(options, function (err, pathnames) {
    if (err) {
      callback(err);
      return;
    }

    async.mapSeries(pathnames, function (pathname, next) {
      var render = RENDERER[pathname.extension];

      if (!render) {
        next("Don't know how to compile " + pathname);
        return;
      }

      render(pathname, next);
    }, function (err, parts) {
      callback(err, parts ? parts.join('\n\n') : null);
    });
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports.compile = compile;
