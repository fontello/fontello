"use strict";


/*global N, _*/


// stdlib
var fs   = require('fs');
var path = require('path');


// 3rd-party
var Mincer = require('mincer');
var nib    = require('nib');


// internal
var environment = require('./mincer/environment');
var manifest    = require('./mincer/manifest');


////////////////////////////////////////////////////////////////////////////////


//
// set custom logger for the Mincer
//

Mincer.logger.use(N.logger.getLogger('system'));

//
// Add some funky stuff to Stylus
//

Mincer.StylusEngine.registerConfigurator(function (style) {
  style.use(nib());
  style.define('import-dir', require('./mincer/stylus/import-dir'));
});


////////////////////////////////////////////////////////////////////////////////


module.exports = function mincer(tmpdir, config, callback) {
  var env     = environment.configure(tmpdir, config).index,
      outdir  = path.join(N.runtime.apps[0].root, 'public', 'assets');

  //
  // compile assets
  //

  manifest.compile(env, config, outdir, function (err, data) {
    if (err) {
      callback(err);
      return;
    }

    N.runtime.assets = { environment: env, manifest: data };
    callback();
  });
};
