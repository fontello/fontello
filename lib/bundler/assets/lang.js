'use strict';


const Asset     = require('./base');
const BabelFish = require('babelfish');
const co        = require('bluebird-co').co;


function AssetLang(bundler, options) {
  Asset.apply(this, arguments);

  this.lang = options.lang;
  this.fallback = options.fallback;
  this.__queue__ = [];
}


require('util').inherits(AssetLang, Asset);


AssetLang.type = AssetLang.prototype.type = 'lang';


AssetLang.prototype.addPhrase = function (lang, path, apiPath, phrase) {
  if (path) { this.dependOnFile(path); }
  this.__queue__.push([ lang, apiPath, phrase ]);
};


AssetLang.prototype.resolve = function () {
  let self = this;

  if (self.__promise__) return self.__promise__;

  self.__promise__ = co(function* () {
    if (yield self.__restore_cache__()) return;

    if (self.__queue__.length) {
      let babelfish = new BabelFish();

      if (self.fallback) {
        babelfish.setFallback(self.lang, self.fallback);
      }
      self.__queue__.forEach(p => babelfish.addPhrase(p[0], p[1], p[2], false));
      self.source = babelfish.stringify(self.lang);
    } else {
      self.source = '';
    }

    yield self.__run_plugins__();

    self.digest = self.dependenciesDigest;

    yield self.__save_cache__();
  }).then(() => { self.resolved = true; });

  return self.__promise__;
};


module.exports = AssetLang;
