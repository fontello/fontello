'use strict';


const _       = require('lodash');
const Asset   = require('./base');


function AssetConcat() {
  Asset.apply(this, arguments);

  this.__queue__ = [];
}


require('util').inherits(AssetConcat, Asset);


AssetConcat.type = AssetConcat.prototype.type = 'concat';


Object.defineProperty(AssetConcat.prototype, 'isFresh', {
  get() {
    if (!this.resolved) { return false; }

    return _.values(this.__dependencies__)
            .every(depObj => this.isDependencyFresh(depObj));
  }
});


AssetConcat.prototype.push = function (asset) {
  if (_.isString(asset)) {
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

    let assets = this.__queue__.map(path => this.__bundler__.findAsset(path));

    this.source   = '' + assets
                           .map(asset => asset.source)
                           .filter(src => Boolean(src)) // Exclude empty
                           .join('\n\n');

    await this.__run_plugins__();

    this.digest = this.dependenciesDigest;

    await this.__save_cache__();
  })().then(() => { this.resolved = true; });

  return this.__promise__;
};


module.exports = AssetConcat;
