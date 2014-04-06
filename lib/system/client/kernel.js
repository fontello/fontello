'use strict';


module.exports = function (N) {
  var Wire      = require('../wire');
  var Pointer   = require('pointer');
  var BabelFish = require('babelfish');

  N.runtime         = N.runtime || {};
  N.runtime.router  = new Pointer();

  // No need to set default locale in constructor, since we use 1
  // language on client.
  N.runtime.i18n    = new BabelFish();

  // translations injector
  N.runtime.i18n.load = function loadTranslations(lang, data) {
    if (undefined === N.runtime.i18n._storage[lang]) {
      N.runtime.i18n._storage[lang]  = {};
      N.runtime.i18n._compiled[lang] = true;
    }

    $.extend(N.runtime.i18n._storage[lang], data);
  };

  // translation helper with active locale
  N.runtime.t = function (phrase, params) {
    return N.runtime.i18n.t(N.runtime.locale, phrase, params);
  };

  N.runtime.t.exists = function (phrase) {
    return N.runtime.i18n.hasPhrase(N.runtime.locale, phrase);
  };

  N.wire           = new Wire();
  N.logger         = require('./kernel/logger');
  N.io             = require('./kernel/io');
  N.runtime.render = require('./kernel/render');

  // refer runtime in templates wrappers. Needed to render templates.
  N.__jade_runtime   = require('jade/lib/runtime.js');
};
