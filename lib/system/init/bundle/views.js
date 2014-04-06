// `views` section processor
//


'use strict';


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _       = require('lodash');
var fstools = require('fs-tools');


// internal
var stopwatch = require('../utils/stopwatch');
var ENGINES   = require('./views/engines');
var findPaths = require('./utils/find_paths');
var Processor = require('./utils/cached_processor');


////////////////////////////////////////////////////////////////////////////////


var WRAPPER_TEMPLATE_PATH = path.join(__dirname, 'views', 'wrapper.tpl');
var WRAPPER_TEMPLATE = _.template(fs.readFileSync(WRAPPER_TEMPLATE_PATH, 'utf8'));


////////////////////////////////////////////////////////////////////////////////


module.exports = function (sandbox) {
  var N         = sandbox.N
    , clientDir = path.join(sandbox.tmpdir, 'views')
    , timer     = stopwatch();

  N.views = {};
  fstools.mkdirSync(clientDir);

  _.forEach(sandbox.config.packages, function (pkgConfig, pkgName) {
    var clientViews = {}
      , clientFile  = path.join(clientDir, pkgName + '.js');

    // cacher for client templates
    var clientProcessor = new Processor({
      cache: path.join(N.config.options.cache_dir, 'modules_views', 'client-' + pkgName + '.json')
    });
    clientProcessor.process = function (file) {
      var extname = path.extname(file)
        , render  = ENGINES[extname];
      return render.client(file);
    };

    // cacher for server templates
    var serverProcessor = new Processor({
      cache: path.join(N.config.options.cache_dir, 'modules_views', 'server-' + pkgName + '.json')
    });
    serverProcessor.process = function (file) {
      var extname = path.extname(file)
        , render  = ENGINES[extname];
      return render.server(file);
    };

    // Build templates
    findPaths(pkgConfig.views, function (file, apiPath) {
      try {
        /*jshint evil:true*/
        N.views[apiPath]     = (new Function('require', serverProcessor.get(file)))(require);
        clientViews[apiPath] = clientProcessor.get(file);
      } catch (e) {
        throw new Error('Error in view "' + apiPath + '". ' + e);
      }
    });


    fs.writeFileSync(
      clientFile,
      Object.keys(clientViews).length ? WRAPPER_TEMPLATE({ views: clientViews }) : '',
      'utf8'
    );
  });

  N.logger.info('Processed views section %s', timer.elapsed);
};
