'use strict';


const _          = require('lodash');
const browserify = require('browserify');
const cacheify   = require('cacheify');
const uglifyify  = require('uglifyify');


module.exports = async function (sandbox) {
  let pkg_names = _.keys(sandbox.config.packages);

  for (let i = 0; i < pkg_names.length; i++) {
    let pkg = sandbox.config.packages[pkg_names[i]];

    if (!_.keys(pkg.vendor).length) continue;

    let b = browserify({
      prelude: 'NodecaLoader.wrap',
      detectGlobals: false
    });

    // exclude vendor files included in other bundles
    _.forEach(sandbox.config.packages, p => {
      if (p === pkg) return;

      _.forEach(p.vendor, (__, name) => {
        b.exclude(name);
      });
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

    let out = await new Promise((resolve, reject) => {
      b.bundle((err, result) => (err ? reject(err) : resolve(result)));
    });

    asset.source = String(out);

    sandbox.component_client[pkg_names[i]].js.push(asset);
  }
};
