// Main application initializer.


'use strict';


/*global N*/


// stdlib
var fs = require('fs');


// 3rd-party
var async   = require('nlib').Vendor.Async;
var fstools = require('nlib').Vendor.FsTools;


// internal
var readPkgConfig = require('./app/utils').readPkgConfig;
var stopWatch     = require('./app/utils').stopWatch;


////////////////////////////////////////////////////////////////////////////////


module.exports = function (callback) {
  var timer = stopWatch(), tmpdir;

  // schedule files cleanup upon normal exit
  process.on('exit', function (code) {
    if (0 !== +code) {
      console.warn("Unclean exit. Bundled files left in '" + tmpdir + "'");
      return;
    }

    try {
      console.warn("Removing '" + tmpdir + "'...");
      fstools.removeSync(tmpdir);
    } catch (err) {
      console.warn("Failed remove '" + tmpdir + "'... " + String(err));
    }
  });

  try {
    // create temporary dir for styles
    tmpdir = fstools.tmpdir();
    fs.mkdirSync(tmpdir);
  } catch (err) {
    next(err);
    return;
  }

  readPkgConfig(N.runtime.apps, function (err, config) {
    var sandbox = {};

    if (err) {
      callback(err);
      return;
    }

    sandbox.config = config;
    sandbox.assets = {
      environment:  require('./app/mincer').init(tmpdir, config, N.runtime.apps),
      // holds list of assets to be bundled by mincer
      files:        []
    };

    async.series([
      async.apply(require('./app/bin'),     tmpdir, sandbox),
      async.apply(require('./app/styles'),  tmpdir, sandbox),
      async.apply(require('./app/i18n'),    tmpdir, sandbox),
      async.apply(require('./app/views'),   tmpdir, sandbox),
      async.apply(require('./app/client'),  tmpdir, sandbox),
      async.apply(require('./app/server'),  tmpdir, sandbox),
      async.apply(require('./app/bundle'),  tmpdir, sandbox)
    ], function (err) {
      N.logger.debug('App initialized ' + timer.elapsed);
      callback(err);
    });
  });
};
