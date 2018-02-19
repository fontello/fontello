'use strict';


const mkdirp        = require('mkdirp');
const fs            = require('fs');
const crypto        = require('crypto');
const _             = require('lodash');
const path          = require('path');
const { promisify } = require('util');
const gzip          = promisify(require('zlib').gzip);
const write         = promisify(require('write-file-atomic'));


const asset_classes = [
  require('./assets/concat'),
  require('./assets/lang'),
  require('./assets/file')
];


const plugins = [
  'load_bin',
  'load_text',
  'wrapper',
  'stylus',
  'less',
  'sass',
  'auto',
  'jade',
  'pug',
  'macros',
  'autoprefixer',
  'uglifyjs',
  'csswring'
].reduce((acc, name) => {
  acc[name] = require(path.join(__dirname, 'plugins', name));
  return acc;
}, {});


function Bundler(options) {
  if (!options) throw new Error('Bundler: missed constructor options');

  if (!options.root) throw new Error('Bundler: "root" should be defined');

  this.root = options.root;

  const opts = _.defaults({}, options, {
    version: '',
    sourceMaps: false,
    compress: false
  });

  this.version = opts.version;
  this.sourceMaps = opts.sourceMaps;
  this.compress = opts.compress;

  this.__assets_classes__ = {};
  this.__plugins__ = {};

  asset_classes.forEach(cls => { this.registerAssetClass(cls); });
  _.forEach(plugins, (fn, name) => { this.registerPlugin(name, fn); });

  this.__helpers__ = {};
  this.__assets__ = {};

  this.cache = {
    get: (key, cb) => {
      cb();
    },
    put: (key, val, opt, cb) => {
      cb();
    }
  };
}


Bundler.prototype.registerHelper = function (name, fn) {
  this.__helpers__[name] = fn;
};


Bundler.prototype.registerPlugin = function (name, fn) {
  this.__plugins__[name] = fn;
};


Bundler.prototype.findAsset = function (path) {
  return this.__assets__[path];
};


Bundler.prototype.registerAssetClass = function (cls) {
  this.__assets_classes__[cls.type] = cls;
};


Bundler.prototype.createClass = function (name, options) {
  if (this.findAsset(options.logicalPath)) {
    throw new Error(`Bundler: asset "${options.logicalPath}" already exists`);
  }

  if (!this.__assets_classes__[name]) {
    throw new Error(`Bundler: asset class "${name}" not found`);
  }

  const asset = new this.__assets_classes__[name](this, options);

  this.__assets__[asset.logicalPath] = asset;

  return asset;
};


Object.defineProperty(Bundler.prototype, 'hasher', {
  get() {
    return crypto.createHash('md5').update(this.version, 'utf8');
  }
});


Bundler.prototype.getFileDigest = function (pathname) {
  const stat = this.stat(pathname);

  if (stat && stat.isDirectory()) {
    throw new Error(`Bundler: can't create digest on directory (${pathname})`);
  }

  // If file, digest the contents
  return this.hasher.update(this.readFile(pathname) || '').digest('hex');
};


Bundler.prototype.stat = function (pathname) {
  try {
    return fs.statSync(pathname);
  } catch (err) {
    if (err.code !== 'ENOENT') { throw err; }
  }

  return null;
};


Bundler.prototype.readFile = function (filename, encoding) {
  encoding = encoding || null;
  try {
    return fs.readFileSync(filename, encoding);
  } catch (__) {}

  return null;
};


// Compile assets and create manifest file
//
Bundler.prototype.compile = async function () {
  // Resolve public assets only. Dependencies will ve resolved automatically.
  const public_assets = _.values(this.__assets__).filter(asset => !asset.virtual);

  // Resolve public assets
  await Promise.all(public_assets.map(asset => asset.resolve()));

  // Write assets
  for (let i = 0; i < public_assets.length; i++) {
    let asset = public_assets[i];

    let target = path.join(this.root, asset.digestPath);

    try {
      fs.statSync(target);
      // if no error - file exists, skip
      continue;
    } catch (__) {}

    let buffer = asset.buffer;

    if (this.sourceMaps && asset.sourceMap()) {
      buffer = Buffer.concat([ buffer, Buffer.from(asset.mappingUrlComment()) ]);
    }

    mkdirp.sync(path.dirname(target));

    // Can be done in parallel

    await Promise.all([
      // Write asset
      write(target, buffer),

      // Write gzipped asset
      Promise.resolve().then(() => {
        if (!this.compress) return;

        return gzip(buffer).then(res => write(target + '.gz', res));
      }),

      // Write source map
      Promise.resolve().then(() => {
        if (!asset.sourceMap()) return;
        // add XSSI protection header
        return write(target + '.map', ')]}\'\n' + asset.sourceMap());
      }),

      // Write gzipped source map
      Promise.resolve().then(() => {
        if (!asset.sourceMap() || !this.__options__.compress) return;

        return gzip(')]}\'\n' + asset.sourceMap())
          .then(res => write(target + '.map.gz', res));
      })
    ]);
  }


  let manifest = _.chain(this.__assets__)
                  .pickBy(asset => asset.resolved)
                  .pickBy(asset => !asset.virtual)
                  .mapValues(asset => _.pick(asset, [
                    'virtual',
                    'digest',
                    // 'dependencies',
                    'digestPath'
                  ]))
                  .valueOf();

  return manifest;
};


Bundler.DependencyError = Bundler.prototype.DependencyError = require('./utils/dependency_error');


module.exports = Bundler;
