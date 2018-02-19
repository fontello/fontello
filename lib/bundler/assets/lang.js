'use strict';


const BabelFish = require('babelfish');
const Asset     = require('./base');


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
  if (this.__promise__) return this.__promise__;

  this.__promise__ = (async () => {
    if (await this.__restore_cache__()) return;

    if (this.__queue__.length) {
      let babelfish = new BabelFish();

      if (this.fallback) {
        babelfish.setFallback(this.lang, this.fallback);
      }
      this.__queue__.forEach(p => babelfish.addPhrase(p[0], p[1], p[2], false));
      this.source = babelfish.stringify(this.lang);
    } else {
      this.source = '';
    }

    await this.__run_plugins__();

    this.digest = this.dependenciesDigest;

    await this.__save_cache__();
  })().then(() => { this.resolved = true; });

  return this.__promise__;
};


module.exports = AssetLang;
