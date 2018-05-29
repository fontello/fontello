'use strict';


const path    = require('path');
const Asset   = require('./base');


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

    // use forward slashes on windows to simplify code
    return 'public/' + path_obj.name + '-' + this.digest + path_obj.ext;
  }
});


AssetFile.prototype.resolve = function () {
  if (this.__promise__) return this.__promise__;

  this.__promise__ = (async () => {
    await this.__resolveDependencies__();

    if (await this.__restore_cache__()) return;

    await this.__run_plugins__();

    this.digest = this.dependenciesDigest;

    await this.__save_cache__();
  })().then(() => { this.resolved = true; });

  return this.__promise__;
};


module.exports = AssetFile;
