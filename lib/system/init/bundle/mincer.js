// Prepres Mincer environent and saves it as sandbox.assets.environment
//


'use strict';


var Mincer    = require('mincer');
var stopwatch = require('../utils/stopwatch');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (sandbox) {
  var tmpdir = sandbox.tmpdir
    , timer   = stopwatch()
    , N = sandbox.N
    , environment;


  //
  // set custom logger for the Mincer
  //

  Mincer.logger.use(N.logger);


  environment = new Mincer.Environment(tmpdir);

  //
  // set mincer cache dir
  //
  environment.cache = new Mincer.FileStore(N.config.options.cache_dir);


  //
  // Enable autoprefixer
  //
  Mincer.Autoprefixer.configure([
    'android >= 2.2',
    'bb >= 7',
    'chrome >= 26',
    'ff >= 17',
    'ie >= 8',
    'ios >= 5',
    'opera >= 12',
    'safari >= 5'
  ]);
  environment.enable("autoprefixer");


  //
  // Provide some helpers to EJS and Stylus
  //

  environment.ContextClass.defineAssetPath(function (pathname, options) {
    var asset = environment.findAsset(pathname, options);
    return !asset ? null : ("/assets/" + asset.digestPath);
  });

  //
  // Add jetson serializer helper
  //

  environment.registerHelper('jetson', require('../../jetson').serialize);


  sandbox.assets = {
    environment:  environment,
    // holds list of assets to be bundled by mincer
    files:        []
  };

  N.logger.info('Initialized assets manager %s', timer.elapsed);
};
