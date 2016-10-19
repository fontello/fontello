'use strict';


module.exports = function (N) {
  N.runtime = N.runtime || {};

  N.wire    = require('event-wire')();
  N.router  = require('pointer')('$$ N.router.stringify() $$');
  N.environment  = '$$ JSON.stringify(N.environment) $$';
  N.version_hash = '$$ JSON.stringify(N.version_hash) $$';
  // No need to set default locale in constructor, since we use 1
  // language on client.
  N.i18n    = require('babelfish')('en-US');

  // translation helper with active locale
  N.runtime.t = (phrase, params) => N.i18n.t(N.runtime.locale, phrase, params);

  N.runtime.t.exists = phrase => N.i18n.hasPhrase(N.runtime.locale, phrase);

  N.logger         = require('./kernel/logger');
  N.io             = require('./kernel/io')(N);
  N.runtime.render = require('./kernel/render')(N);

  //
  // Emit io.* events like rpc does to signal user about executing
  // network requests.
  //
  let defaultLoadAssets = N.loader.loadAssets;

  N.loader.loadAssets = function () {
    let args = Array.prototype.slice.call(arguments),
        callback = args[args.length - 1];

    N.wire.emit('io.request');

    args[args.length - 1] = function () {
      N.wire.emit('io.complete', {});
      return callback.apply(this, arguments);
    };

    return defaultLoadAssets.apply(this, args);
  };
};
