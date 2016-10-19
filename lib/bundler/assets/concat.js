'use strict';


const _       = require('lodash');
const Promise = require('bluebird');
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
  let self = this;

  if (self.__promise__) return self.__promise__;

  self.__promise__ = Promise.coroutine(function* () {
    yield self.__resolveDependencies__();

    if (yield self.__restore_cache__()) return;

    let assets = self.__queue__.map(path => self.__bundler__.findAsset(path));

    self.source   = '' + assets
                           .map(asset => asset.source)
                           .filter(src => Boolean(src)) // Exclude empty
                           .join('\n\n');

    yield self.__run_plugins__();

    self.digest = self.dependenciesDigest;

    yield self.__save_cache__();
  })().then(() => { self.resolved = true; });

  return self.__promise__;
};


module.exports = AssetConcat;
