'use strict';


module.exports = function (N) {
  N.runtime = N.runtime || {};

  N.wire    = require('event-wire')();
  N.router  = require('../router')('$$ N.router.stringify() $$');
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
    N.wire.emit('io.request');

    return defaultLoadAssets.apply(this, arguments)
      .then(function () {
        N.wire.emit('io.complete', {});
      }, function (err) {
        N.wire.emit('io.complete', {});
        throw err;
      });
  };
};
