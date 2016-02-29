'use strict';


const Asset = require('./base');
const _     = require('lodash');
const async = require('async');


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


AssetConcat.prototype.resolve = function (callback) {
  this.lock(release => {
    if (this.resolved) {
      release(callback);
      return;
    }

    async.series([
      cb => this.__resolveDependencies__(cb),

      cb => {
        this.__restore_cache__((err, restored) => cb(restored ? 'RESOLVED' : err));
      },

      cb => {
        let assets = this.__queue__.map(path => this.__bundler__.findAsset(path));

        this.source   = '' + assets
                               .map(asset => asset.source)
                               .filter(src => Boolean(src)) // Exclude empty
                               .join('\n\n');
        cb();
      },

      cb => this.__run_plugins__(cb),

      cb => {
        this.digest = this.dependenciesDigest;
        cb();
      },

      cb => this.__save_cache__(cb)

    ], err => {
      this.resolved = true;

      release(callback, err === 'RESOLVED' ? null : err);
    });
  });
};


module.exports = AssetConcat;
