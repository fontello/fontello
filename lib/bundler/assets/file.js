'use strict';


const Promise = require('bluebird');
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

    return path.join('public', path_obj.name + '-' + this.digest + path_obj.ext);
  }
});


AssetFile.prototype.resolve = function () {
  let self = this;

  if (self.__promise__) return self.__promise__;

  self.__promise__ = Promise.coroutine(function* () {
    yield self.__resolveDependencies__();

    if (yield self.__restore_cache__()) return;

    yield self.__run_plugins__();

    self.digest = self.dependenciesDigest;

    yield self.__save_cache__();
  })().then(() => { self.resolved = true; });

  return self.__promise__;
};


module.exports = AssetFile;
