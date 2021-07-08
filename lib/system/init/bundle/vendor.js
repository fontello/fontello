'use strict';


const babelify   = require('babelify');
const browserify = require('browserify');
const cacheify   = require('cacheify');
const tersify    = require('./utils/tersify');


module.exports = async function (sandbox) {
  for (let [ pkg_name, pkg ] of Object.entries(sandbox.config.packages)) {
    if (!Object.keys(pkg.vendor).length) continue;

    let b = browserify({
      prelude: 'NodecaLoader.wrap',
      detectGlobals: false,
      debug: sandbox.bundler.sourceMaps // adds inline source maps
    });

    // exclude vendor files included in other bundles
    for (let p of Object.values(sandbox.config.packages)) {
      if (p === pkg) continue;

      for (let name of Object.keys(p.vendor)) {
        b.exclude(name);
      }
    }

    b.transform(cacheify(babelify.configure({
      presets: [ '@babel/preset-env' ]
    }), sandbox.cache_db), { global: true });

    if (sandbox.compression) {
      b.transform(cacheify(tersify, sandbox.cache_db), { global: true });
    }

    for (let [ name, path ] of Object.entries(pkg.vendor)) {
      b.require(path, { expose: name });
    }

    let asset = sandbox.bundler.createClass('file', {
      logicalPath: 'internal/public/package-component-vendor-' + pkg_name + '.js',
      plugins: [ 'macros' ],
      virtual: true
    });

    let out = await new Promise((resolve, reject) => {
      b.bundle((err, result) => (err ? reject(err) : resolve(result)));
    });

    let source = String(out);
    let map = null;

    if (sandbox.bundler.sourceMaps) {
      let re = /(?:^|[^.])\/\/# sourceMappingURL=data:application\/json(;[\w=-]*)?;base64,([+/0-9A-Za-z]*=*)\s*$/;
      let match = re.exec(source);
      if (match) {
        source = source.slice(0, match.index);
        map = JSON.parse(Buffer.from(match[2], 'base64').toString('utf8'));
      }
    }

    asset.source = source;
    asset.sourceMap = map;

    sandbox.component_client[pkg_name].js.push(asset);
  }
};
