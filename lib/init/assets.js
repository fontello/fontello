"use strict";


/*global N, _*/


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

  // schedule files cleanup upon normal exit
  process.on('exit', function (code) {
    if (0 !== +code) {
      console.warn("Unclean exit. Bundled files left in '" + tmp + "'");
      return;
    }

    try {
      console.warn("Removing '" + tmp + "'...");
      fstools.removeSync(tmp);
    } catch(err) {
      console.warn("Failed remove '" + tmp + "'... " + String(err));
    }
  });

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
