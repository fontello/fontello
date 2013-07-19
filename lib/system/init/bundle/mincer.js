// Prepres Mincer environent and saves it as sandbox.assets.environment
//


'use strict';


var Mincer  = require('mincer');
var nib     = require('nib');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (sandbox) {
  var tmpdir = sandbox.tmpdir
    , N = sandbox.N
    , environment;


  //
  // set custom logger for the Mincer
  //

  Mincer.logger.use(N.logger);


  //
  // Add some funky stuff to Stylus
  //

  Mincer.StylusEngine.configure(function (style) {
    style.use(nib());
  });


  environment = new Mincer.Environment(tmpdir);

  //
  // set mincer cache dir
  //
  environment.cache = new Mincer.FileStore(N.config.options.cache_dir);


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
};
