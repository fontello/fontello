'use strict';


const _          = require('lodash');
const browserify = require('browserify');
const cacheify   = require('cacheify');
const stream     = require('stream');
const path       = require('path');
const babelify   = require('babelify');
const tersify    = require('./utils/tersify');

const resolve_module_path = require('./utils/resolve_module_path');


const before = _.template(`
NodecaLoader.registerClientModule('<%= apiPath %>', function (N, exports, module, t) {`);
const after = '});';


module.exports = function (sandbox) {
  let exclude = [];

  _.forEach(sandbox.config.packages, pkg => {
    _.forEach(pkg.vendor, (__, name) => {
      exclude.push(name);
    });
  });

  // To check if same module was included in multiple packages
  //
  // widget_path -> [ module_path ]
  //
  sandbox.included_modules = {};

  async function browserify_concat_plugin(context) {
    if (!_.trim(context.asset.source, '\n')) return;

    let b = browserify({
      prelude: 'NodecaLoader.wrap',
      detectGlobals: false,
      debug: context.bundler.sourceMaps // adds inline source maps
    });

    context.asset.__queue__.forEach(file_path => {
      let s = new stream.Transform();
      s.push(context.bundler.findAsset(file_path).source);
      s.end();

      b.add(s, { basedir: path.dirname(file_path), file: file_path });
    });

    // Target (list of browsers) is configured in nodeca/package.json (browserslist property,
    // see https://github.com/browserslist/browserslist for details);
    // it generates es5 because as of now (sep 2020) es5 browsers are still ~1.4% of the market
    b.transform(cacheify(babelify.configure({
      presets: [ '@babel/preset-env' ]
    }), sandbox.cache_db), { global: true });

    if (sandbox.compression) {
      b.transform(cacheify(tersify, sandbox.cache_db), { global: true });
    }

    exclude.forEach(e => b.exclude(e));

    b.on('file', path => {
      context.asset.dependOnFile(path);
    });

    b.on('dep', function (row) {
      if (row.entry) {
        _.forEach(row.indexDeps, (index, dep_name) => {
          if (index) {
            let dep_path = resolve_module_path(path.dirname(row.file), dep_name);

            sandbox.included_modules[row.file] = sandbox.included_modules[row.file] || [];
            sandbox.included_modules[row.file].push(dep_path);
          }
        });
      }
    });

    let out = await new Promise((resolve, reject) => {
      b.bundle((err, result) => (err ? reject(err) : resolve(result)));
    });

    let source = String(out);
    let map = null;

    if (context.bundler.sourceMaps) {
      let re = /(?:^|[^.])\/\/# sourceMappingURL=data:application\/json(;[\w=-]*)?;base64,([+/0-9A-Za-z]*=*)\s*$/;
      let match = re.exec(source);
      if (match) {
        source = source.slice(0, match.index);
        map = JSON.parse(Buffer.from(match[2], 'base64').toString('utf8'));
      }
    }

    context.asset.source = source;
    context.asset.sourceMap = map;
  }

  for (let [ pkg_name, pkg ] of Object.entries(sandbox.config.packages)) {
    let widget_js = sandbox.bundler.createClass('concat', {
      logicalPath: 'public/package-component-widget-js-' + pkg_name + '.js',
      virtual: true,
      plugins: [ browserify_concat_plugin, 'macros' ]
    });

    for (let file_info of pkg.files.widget_js || []) {
      let asset = sandbox.bundler.createClass('file', {
        logicalPath: file_info.path,
        virtual: true,
        plugins: [ 'load_text', 'auto', 'wrapper' ],
        wrapBefore: before({ apiPath: file_info.api_path }),
        wrapAfter: after
      });

      widget_js.push(asset);
    }

    sandbox.component_client[pkg_name].js.push(widget_js);

    for (let file_info of pkg.files.js || []) {
      sandbox.bundler.createClass('file', {
        logicalPath: file_info.path,
        plugins: [ 'load_text', 'auto', 'macros' ].concat(sandbox.compression ? [ 'terser' ] : [])
      });
    }
  }
};
