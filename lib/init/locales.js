"use strict";


/*global N*/


// stdlib
var path = require('path');


// 3rd-party
var async     = require('nlib').Vendor.Async;
var BabelFish = require('nlib').Vendor.BabelFish;
var _         = require('underscore');


// internal
var i18n = require('./processors/i18n');


////////////////////////////////////////////////////////////////////////////////


function deepMerge(dst, src) {
  _.each(src, function (val, key) {
    if (!_.isObject(val)) {
      dst[key] = val;
      return;
    }

    deepMerge(dst[key] || (dst[key] = {}), val);
  });
}


function loadTranslations(next) {
  var
  bundleConfig  = require('../../bundle.yml'),
  packageConfig = bundleConfig.packages.fontello,
  translations  = { client: {}, server: {} };

  async.forEachSeries(['server', 'client'], function (section, nextSection) {
    var options, localesConfig = packageConfig['i18n_' + section];

    if (!localesConfig) {
      nextSection();
      return;
    }

    options       = _.pick(localesConfig, 'include', 'exclude');
    options.root  = path.resolve(N.runtime.apps[0].root, localesConfig.root);

    i18n.collect(options, function (err, data) {
      if (err) {
        nextSection(err);
        return;
      }

      deepMerge(translations[section], data);
      nextSection();
    });
  }, function (err) {
    if (err) {
      next(err);
      return;
    }

    N.config.i18n = {
      client: translations.client,
      server: _.defaults(translations.server, translations.client)
    };

    next();
  });
}


function initLocalesConfig(next) {
  var
  config          = N.config.locales || (N.config.locales = {}),
  enabledLocales  = config['enabled'] ? config['enabled']
                  : _.keys(N.config.i18n.server || {}),
  defaultLocale   = config['default'] ? config['default'] : enabledLocales[0];

  if (-1 === enabledLocales.indexOf(defaultLocale)) {
    next("Default locale <" + defaultLocale + "> must be enabled");
    return;
  }

  // reset languages configuration
  N.config.locales = {
    "default": defaultLocale,
    "enabled": enabledLocales,
    "aliases": config['aliases'] || {}
  };

  next();
}


function initServerTranslator(next) {
  N.runtime.i18n = new BabelFish(N.config.locales['default']);

  _.each(N.config.locales['enabled'], function (locale) {
    _.each(N.config.i18n.server[locale] || {}, function (data, scope) {
      N.runtime.i18n.addPhrase(locale, scope, data);
    });
  });

  next();
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (next) {
  async.series([
    loadTranslations,
    initLocalesConfig,
    initServerTranslator
  ], next);
};
