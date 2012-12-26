"use strict";


/*global N*/


// 3rd-party
var Mincer = require('mincer');
var nib    = require('nib');


// internal
var environment = require('./mincer/environment');


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


module.exports.init = function init(tmpdir, config, apps) {
  return environment.configure(tmpdir, config, apps);
};
