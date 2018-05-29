'use strict';


const search_assets = require('./utils/search_assets');
const cached        = require('./utils/fs_cached');
const level         = require('level');
const path          = require('path');
const mkdirp        = require('mkdirp');


module.exports = function (sandbox) {

  const N = sandbox.N,
        bundler = sandbox.bundler;

  let cache_dir = path.join(N.mainApp.root, 'assets', 'cache', N.environment);

  mkdirp.sync(cache_dir);

  let cache_obj = level(cache_dir);

  sandbox.cache_db = cache_obj;

  bundler.cache.get = cache_obj.get.bind(cache_obj);
  bundler.cache.put = cache_obj.put.bind(cache_obj);

  //
  // rebuild assets on configs change:
  //
  bundler.version = N.version_hash;

  //
  // Expose N to marcos
  //
  bundler.registerHelper('N', N);

  bundler.registerHelper('asset_url', function asset_url(asset_path) {
    let resolved_path = require.resolve(asset_path);
    let asset = bundler.findAsset(resolved_path);

    if (!asset) throw new Error(`Invalid asset path ${resolved_path}`);

    if (asset.resolved) {
      // assume that digestPath has forward slashes even on windows
      return '/assets/' + asset.digestPath.replace(/^public\//, '');
    }

    throw new bundler.DependencyError(resolved_path);
  });

  bundler.registerHelper('asset_body', function asset_body(path) {
    let resolved_path = require.resolve(path);
    let asset = bundler.findAsset(resolved_path);

    if (!asset) throw new Error(`Invalid asset path ${resolved_path}`);

    if (asset.resolved) return asset.source;

    throw new bundler.DependencyError(resolved_path);
  });

  // Setup cached methods
  bundler.stat     = cached.stat;
  bundler.readFile = cached.file;

  // Prepare config and collect files
  sandbox.config = search_assets(N.apps);

  // Use csswring and uglifyjs
  sandbox.compression = sandbox.N.environment !== 'development' && process.env.NODECA_NOMINIFY !== '1';
};
