// `client` section processor
//


'use strict';


/*global underscore, N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _       = underscore;
var ejs     = require('ejs');
var fstools = require('fs-tools');


// internal
var safePropName  = require('./utils/safe_prop_name');
var stopwatch     = require('./utils/stopwatch');
var Requisite     = require('./client/requisite');


////////////////////////////////////////////////////////////////////////////////


var TEMPLATE = fs.readFileSync(__dirname + '/client/template/package.js.ejs', 'utf8');


////////////////////////////////////////////////////////////////////////////////


function browserify(files) {
  var
  headers     = [],
  modulesList = [],
  exportsList = [],
  requisite   = new Requisite();

  _.each(files, function (pathname) {
    var // [ '["foo"]', '["bar"]', '["baz"]' ]
    apiPathParts  = pathname.apiPath.split('.').map(safePropName),
    source        = requisite.process(pathname.readSync(), pathname);

    // feed all parents of apiPath into heads array
    apiPathParts.reduce(function (prev, curr) {
      if (-1 === headers.indexOf(prev)) {
        headers.push(prev);
      }

      return prev + curr;
    });

    modulesList.push({
      apiSafe: apiPathParts.join(''),
      source:  source,
      apiPath: pathname.apiPath
    });

    exportsList.push('this' + apiPathParts.join(''));
  });

  return ejs.render(TEMPLATE, {
    requisite:  requisite.bundle(),
    headers:    _.uniq(headers.sort(), true),
    modules:    modulesList,
    exports:    exportsList
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, sandbox, callback) {
  var
  config  = sandbox.config,
  timer   = stopwatch(),
  outdir  = path.join(tmpdir, 'client');

  try {
    fstools.mkdirSync(outdir);

    _.each(config.packages, function (pkgConfig, pkgName) {
      var filename = path.join(outdir, pkgName + '.js');

      if (pkgConfig.client) {
        fs.writeFileSync(filename, browserify(pkgConfig.client.files));
      }
    });
  } catch (err) {
    callback(err);
    return;
  } finally {
    N.logger.info('Processed client section ' + timer.elapsed);
  }

  callback();
};
