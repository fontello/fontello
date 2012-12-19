// `i18n` section processor
//
//  .
//  |- /i18n/
//  |   |- /<package>/
//  |   |   |- <locale>.js
//  |   |   `- ...
//  |   `- ...
//  `- ...
//


'use strict';


/*global N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _         = require('underscore');
var async     = require('nlib').Vendor.Async;
var BabelFish = require('nlib').Vendor.BabelFish;
var fstools   = require('nlib').Vendor.FsTools;


// internal
var findPaths = require('./utils').findPaths;
var deepMerge = require('./utils').deepMerge;
var stopWatch = require('./utils').stopWatch;
var serialize = require('../../jetson').serialize;


////////////////////////////////////////////////////////////////////////////////


function collectTranslations(pathnames) {
  var translations = {};

  pathnames.forEach(function (pathname) {
    var data;

    try {
      data = pathname.require();
    } catch (err) {
      throw new Error("Can't read i18n file '" + pathname + "':\n" +
                      (err.stack || err.message || err));
    }

    _.each(data, function (phrases, locale) {
      if (!translations[locale]) {
        translations[locale] = {};
      }

      translations[locale][pathname.api] = phrases;
    });
  });

  return translations;
}


function getAvailableLocales(tree) {
  var locales = [];

  _.each(tree, function (pkgTree) {
    _.each(pkgTree, function (i18n) {
      locales = _.union(locales, _.keys(i18n));
    });
  });

  return locales;
}


function initLocales(tree) {
  var
  localesConfig   = N.config.locales || (N.config.locales = {}),
  enabledLocales  = localesConfig['enabled'] ? localesConfig['enabled']
                  : getAvailableLocales(tree),
  defaultLocale   = localesConfig['default'] ? localesConfig['default']
                  : enabledLocales[0];

  if (-1 === enabledLocales.indexOf(defaultLocale)) {
    throw "Default locale <" + defaultLocale + "> must be enabled";
  }

  // reset languages configuration
  N.config.locales = {
    "default": defaultLocale,
    "enabled": enabledLocales
  };
}


function initServerTranslator(tree) {
  var united = {};

  _.each(tree, function (subtree) {
    deepMerge(united, subtree.client);
    deepMerge(united, subtree.server);
  });

  N.runtime.i18n = new BabelFish(N.config.locales['default']);

  _.each(N.config.locales['enabled'], function (locale) {
    _.each(united[locale] || {}, function (data, scope) {
      N.runtime.i18n.addPhrase(locale, scope, data);
    });
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, config, callback) {
  var
  timer = stopWatch(),
  tree  = {};

  try {
    // collect translations of all packages in a common tree
    _.each(config.packages, function (pkgConfig, pkgName) {
      tree[pkgName] = {
        server: collectTranslations((pkgConfig.i18n_server || {}).files  || []),
        client: collectTranslations((pkgConfig.i18n_client || {}).files  || [])
      };
    });

    initLocales(tree);
    initServerTranslator(tree);

    _.keys(config.packages).forEach(function (pkgName) {
      var
      subtree     = tree[pkgName].client,
      translator  = new BabelFish(N.config.locales['default']),
      outdir      = path.join(tmpdir, 'i18n', pkgName);

      fstools.mkdirSync(outdir);

      // fill in data of all enabled locales
      _.each(N.config.locales['enabled'], function (locale) {
        _.each(subtree[locale] || {}, function (data, scope) {
          translator.addPhrase(locale, scope, data);
        });
      });

      // flush out compiled phrases
      _.each(N.config.locales['enabled'], function (locale) {
        var
        outfile = path.join(outdir, locale + '.js'),
        source  = 'N.runtime.i18n.load(' +
                  JSON.stringify(locale) + ',' +
                  serialize(translator.getCompiledData(locale)) + ');';

        fs.writeFileSync(outfile, source, 'utf8');
      });
    });
  } catch (err) {
    callback(err);
    return;
  } finally {
    N.logger.info('Processed i18_* sections ' + timer.elapsed);
  }

  callback();
};
