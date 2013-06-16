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

    findPaths(pkgConfig.views, function (fsPath, apiPath) {
      var extname = path.extname(fsPath)
        , render  = ENGINES[extname]
        , string  = fs.readFileSync(fsPath, 'utf8');

      try {
        N.views[apiPath]     = render.server(string, { filename: fsPath });
        clientViews[apiPath] = render.client(string, { filename: fsPath });
      } catch (e) {
        throw new Error('Error in view "' + apiPath + '". ' + e);
      }
    });

    fs.writeFileSync(clientFile, WRAPPER_TEMPLATE({ views: clientViews }), 'utf8');
  });

  N.logger.info('Processed views section %s', timer.elapsed);
};
