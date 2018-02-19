'use strict';


const _          = require('lodash');
const browserify = require('browserify');
const cacheify   = require('cacheify');
const uglifyify  = require('uglifyify');
const stream     = require('readable-stream');
const path       = require('path');
const babelify   = require('babelify');
const utils      = require('./utils/search_assets');
const Promise    = require('bluebird');


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
      detectGlobals: false
    });

    context.asset.__queue__.forEach(file_path => {
      let s = new stream.Transform();
      s.push(context.bundler.findAsset(file_path).source);
      s.end();

      b.add(s, { basedir: path.dirname(file_path), file: file_path });
    });

    // babelify settings defined in package.json of each application
    b.transform(cacheify(babelify.configure(), sandbox.cache_db));

    if (sandbox.compression) {
      b.transform(cacheify(uglifyify, sandbox.cache_db), { global: true });
    }

    exclude.forEach(e => b.exclude(e));

    b.on('file', path => {
      context.asset.dependOnFile(path);
    });

    b.on('dep', function (row) {
      if (row.entry) {
        _.forEach(row.indexDeps, (index, dep_name) => {
          if (index) {
            let dep_path = utils.resolve_module_path(path.dirname(row.file), dep_name);

            sandbox.included_modules[row.file] = sandbox.included_modules[row.file] || [];
            sandbox.included_modules[row.file].push(dep_path);
          }
        });
      }
    });

    let out = await new Promise((resolve, reject) => {
      b.bundle((err, result) => (err ? reject(err) : resolve(result)));
    });

    context.asset.source = String(out);
  }

  _.forEach(sandbox.config.packages, (pkg, pkg_name) => {
    let widget_js = sandbox.bundler.createClass('concat', {
      logicalPath: 'public/package-component-widget-js-' + pkg_name + '.js',
      virtual: true,
      plugins: [ browserify_concat_plugin, 'macros' ]
    });

    _.forEach(pkg.files.widget_js, file_info => {
      let asset = sandbox.bundler.createClass('file', {
        logicalPath: file_info.path,
        virtual: true,
        plugins: [ 'load_text', 'auto', 'wrapper' ],
        wrapBefore: before({ apiPath: file_info.api_path }),
        wrapAfter: after
      });

      widget_js.push(asset);
    });

    sandbox.component_client[pkg_name].js.push(widget_js);

    _.forEach(pkg.files.js, file_info => {
      sandbox.bundler.createClass('file', {
        logicalPath: file_info.path,
        plugins: [ 'load_text', 'auto', 'macros' ].concat(sandbox.compression ? [ 'uglifyjs' ] : [])
      });
    });
  });
};
