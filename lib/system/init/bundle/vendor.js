'use strict';


const _          = require('lodash');
const Promise    = require('bluebird');
const browserify = require('browserify');
const cacheify   = require('cacheify');
const uglifyify  = require('uglifyify');


module.exports = function* (sandbox) {
  let pkg_names = _.keys(sandbox.config.packages);

  for (let i = 0; i < pkg_names.length; i++) {
    let pkg = sandbox.config.packages[pkg_names[i]];

    if (!_.keys(pkg.vendor).length) continue;

    let b = browserify({
      prelude: 'NodecaLoader.wrap',
      detectGlobals: false,
      noParse: sandbox.browserify.no_parse
    });

    if (sandbox.compression) {
      b.transform(cacheify(uglifyify, sandbox.cache_db), { global: true });
    }

    _.forEach(pkg.vendor, (path, name) => {
      b.require(path, { expose: name });
    });

    let asset = sandbox.bundler.createClass('file', {
      logicalPath: 'internal/public/package-component-vendor-' + pkg_names[i] + '.js',
      plugins: [ 'macros' ],
      virtual: true
    });

    asset.source = yield Promise.fromCallback(cb => b.bundle(cb))
                            .then(out => String(out));

    sandbox.component_client[pkg_names[i]].js.push(asset);
  }
};
