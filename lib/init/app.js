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
  var timer = stopWatch(), tmpdir, config, environment;

  try {
    // read configs from all appliations
    config = readPkgConfig(N.runtime.apps);
    // create temporary dir for styles
    tmpdir = fstools.tmpdir();
    fs.mkdirSync(tmpdir);
  } catch (err) {
    next(err);
    return;
  }

  // Prepare Mincer environment
  N.runtime.assets = {
    environment:  require('./app/mincer').init(tmpdir, config, N.runtime.apps),
    manifest:     {},
    bin:          []
  };

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

  async.series([
    async.apply(require('./app/bin'), tmpdir, config),
    async.apply(require('./app/styles'), tmpdir, config),

    async.apply(require('./app/i18n'), tmpdir, config),

    async.apply(require('./app/views'), tmpdir, config),
    async.apply(require('./app/client'), tmpdir, config),
    async.apply(require('./app/server'), tmpdir, config),

    async.apply(require('./app/bundle'), tmpdir, config)
  ], function (err) {
    N.logger.debug('App initialized ' + timer.elapsed);
    callback(err);
  });
};
