// Prepres Mincer environent and saves it as sandbox.assets.environment
//


'use strict';


var crypto = require('crypto');


var Mincer    = require('mincer');
var stopwatch = require('../utils/stopwatch');


function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

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
  // rebuild assets on config change:
  //
  // - track `bundle.yml` in ALL apps
  //
  environment.version = md5(JSON.stringify(sandbox.config.packages));

  //
  // Enable autoprefixer
  //
  Mincer.Autoprefixer.configure([
    'android >= 2.2',
    'bb >= 7',
    'chrome >= 26',
    'ff >= 24',
    'ie >= 9',
    'ios >= 5',
    'opera >= 12',
    'safari >= 5'
  ]);
  environment.enable('autoprefixer');


  //
  // Enable source maps support. Need future work.
  //
  //environment.enable('source_maps');


  //
  // Provide some helpers to EJS and Stylus
  //

  environment.ContextClass.defineAssetPath(function (pathname, options) {
    // this throws exception with details, if asset not exists
    var resolvedPath = this.resolve(pathname);

    sandbox.assets.used.push(resolvedPath);
    //  console.log(pathname)

    var asset = environment.findAsset(resolvedPath, options);
    return !asset ? null : ('/assets/' + asset.digestPath);
  });

  //
  // Add jetson serializer helper
  //

  environment.registerHelper('jetson', require('../../jetson').serialize);


  sandbox.assets = {
    environment:  environment,
    // holds list of assets to be bundled by mincer
    files:        [],
    // track assets, requested via helpers on compile,
    // used to check integrity in manifest
    //
    // (!!!) Note, that does not track helpers for cached
    // assets (from previous builds) and for runtime calls
    // from .jade templates.
    used:         []
  };

  N.logger.info('Initialized assets manager %s', timer.elapsed);
};
