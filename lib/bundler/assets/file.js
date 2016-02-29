'use strict';


const Asset = require('./base');
const path  = require('path');
const async = require('async');


function AssetFile() {
  Asset.apply(this, arguments);

  if (path.isAbsolute(this.logicalPath)) {
    this.dependOnFile(this.logicalPath);
  }
}


require('util').inherits(AssetFile, Asset);


AssetFile.type = AssetFile.prototype.type = 'file';


Object.defineProperty(AssetFile.prototype, 'digestPath', {
  get() {
    let path_obj = path.parse(this.destPath);

    return path.join('public', path_obj.name + '-' + this.digest + path_obj.ext);
  }
});


AssetFile.prototype.resolve = function (callback) {
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


module.exports = AssetFile;
