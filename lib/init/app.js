// Main application initializer.
// Eventually should become part of NLib.


'use strict';


/*global N*/


// stdlib
var fs = require('fs');


// 3rd-party
var async   = require('nlib').Vendor.Async;
var fstools = require('nlib').Vendor.FsTools;


////////////////////////////////////////////////////////////////////////////////


module.exports = function (next) {
  var tmpdir, config;

  try {
    config = require('./app/utils').readConfig(N.runtime.apps);
    // create temporary dir for styles
    tmpdir = fstools.tmpdir();
    fs.mkdirSync(tmpdir);
  } catch (err) {
    next(err);
    return;
  }

  async.series([
    async.apply(require('./app/assets'), tmpdir, config),
    async.apply(require('./app/styles'), tmpdir, config),

    async.apply(require('./app/i18n'), tmpdir, config),

    async.apply(require('./app/views'), tmpdir, config),
    async.apply(require('./app/client'), tmpdir, config),
    async.apply(require('./app/server'), tmpdir, config),

    async.apply(require('./app/bundle'), tmpdir, config)
  ], next);
};
