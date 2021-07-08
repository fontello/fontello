'use strict';


const Asset          = require('./base');
const concat_sources = require('../utils/concat_sources');


function AssetConcat() {
  Asset.apply(this, arguments);

  this.__queue__ = [];
}


require('util').inherits(AssetConcat, Asset);


AssetConcat.type = AssetConcat.prototype.type = 'concat';


Object.defineProperty(AssetConcat.prototype, 'isFresh', {
  get() {
    if (!this.resolved) { return false; }

    return Object.values(this.__dependencies__)
            .every(depObj => this.isDependencyFresh(depObj));
  }
});


AssetConcat.prototype.push = function (asset) {
  if (typeof asset === 'string') {
    this.__queue__.push(asset);
    this.dependOnFile(asset);
    return;
  }

  this.__queue__.push(asset.logicalPath);
  this.dependOnAsset(asset);
};


AssetConcat.prototype.resolve = function () {
  if (this.__promise__) return this.__promise__;

  this.__promise__ = (async () => {
    await this.__resolveDependencies__();

    if (await this.__restore_cache__()) return;

    let assets = this.__queue__.map(path => this.__bundler__.findAsset(path))
                               .filter(asset => asset.source);

    let { source, map } = concat_sources(assets.map(asset => ({
      source:   asset.source,
      map:      asset.sourceMap,
      filename: asset.sourceMapPath
    })), !!this.__bundler__.sourceMaps);

    this.source = source;
    this.sourceMap = map;

    await this.__run_plugins__();

    this.digest = this.dependenciesDigest;

    await this.__save_cache__();
  })().then(() => { this.resolved = true; });

  return this.__promise__;
};


module.exports = AssetConcat;
