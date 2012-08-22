"use strict";


/*global nodeca, _*/


// 3rd-party
var async   = require('nlib').Vendor.Async;
var fstools = require('nlib').Vendor.FsTools;


////////////////////////////////////////////////////////////////////////////////


/**
 *
 *  RESULTING STRUCTURE
 *
 *    .
 *    ├╴ i18n.js
 *    ├╴ views.js
 *    ╰╴ api.js
 *
 **/

////////////////////////////////////////////////////////////////////////////////


module.exports = function (next) {
  var tmp, environment;

  try {
    tmp = fstools.tmpdir('/tmp/fontello.XXXXX');
  } catch (err) {
    next(err);
    return;
  }

async.series([
    async.apply(fstools.mkdir, tmp),
    async.apply(require('./assets/build_api_tree'), tmp),
    async.apply(require('./assets/build_i18n_files'), tmp),
    async.apply(require('./assets/compile_views'), tmp),
    async.apply(require('./assets/mincer'), tmp)
  ], function (err/*, results*/) {
    next(err);
  });
};
