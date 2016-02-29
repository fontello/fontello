'use strict';


const Asset     = require('./base');
const BabelFish = require('babelfish');
const async     = require('async');


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


AssetLang.prototype.resolve = function (callback) {
  this.lock(release => {
    if (this.resolved) {
      release(callback);
      return;
    }

    async.series([
      cb => {
        this.__restore_cache__((err, restored) => cb(restored ? 'RESOLVED' : err));
      },

      cb => {
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


module.exports = AssetLang;
