'use strict';


/*global N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _         = require('underscore');
var async     = require('nlib').Vendor.Async;
var BabelFish = require('nlib').Vendor.BabelFish;
var JASON     = require('nlib').Vendor.JASON;
var fstools   = require('nlib').Vendor.FsTools;


// internal
var findPaths = require('./utils').findPaths;
var deepMerge = require('./utils').deepMerge;


////////////////////////////////////////////////////////////////////////////////


function collectTranslations(config, callback) {
  var translations = {};

  async.forEachSeries(config.lookup, function (options, next) {
    findPaths(options, function (err, pathnames) {
      if (err) {
        next(err);
        return;
      }

      async.forEachSeries(pathnames, function (pathname, nextPathname) {
        var data;

        try {
          data = pathname.require();
        } catch (err) {
          nextPathname(new Error('Failed read ' + pathname + ':\n' +
                                 (err.stack || err.message || err)));
          return;
        }

        _.each(data, function (phrases, locale) {
          if (!translations[locale]) {
            translations[locale] = {};
          }

          translations[locale][pathname.api] = phrases;
        });

        nextPathname();
      }, next);
    });
  }, function (err) {
    callback(err, translations);
  });
}


function collectTranslationsTree(config, callback) {
  var tree = {};

  async.forEachSeries(_.keys(config.packages), function (pkgName, next) {
    tree[pkgName] = { server: {}, client: {} };

    async.forEach(['client', 'server'], function (part, nextPart) {
      var i18nConfig = config.packages[pkgName]['i18n_' + part];

      if (!i18nConfig) {
        nextPart();
        return;
      }

      collectTranslations(i18nConfig, function (err, data) {
        if (err) {
          nextPart(err);
          return;
        }

        deepMerge(tree[pkgName][part], data);
        nextPart();
      });
    }, next);
  }, function (err) {
    callback(err, tree);
  });
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
  collectTranslationsTree(config, function (err, tree) {
    if (err) {
      callback(err);
      return;
    }

    // there's no difference between throw/catch or fn(callback(err))
    // http://jsperf.com/error-behavior
    try {
      initLocales(tree);
      initServerTranslator(tree);
    } catch (err) {
      callback(err);
      return;
    }

    async.forEachSeries(_.keys(config.packages), function (pkgName, next) {
      var
      subtree     = tree[pkgName].client,
      translator  = new BabelFish(N.config.locales['default']);

      fstools.mkdir(path.join(tmpdir, pkgName, 'i18n'), function (err) {
        if (err) {
          next(err);
          return;
        }

        _.each(N.config.locales['enabled'], function (locale) {
          _.each(subtree[locale] || {}, function (data, scope) {
            N.runtime.i18n.addPhrase(locale, scope, data);
          });
        });

        async.forEachSeries(N.config.locales['enabled'], function (locale, nextLocale) {
          var
          output = path.join(tmpdir, pkgName, 'i18n', locale + '.js'),
          script = 'N.runtime.i18n.load(' +
                  JSON.stringify(locale) + ',' +
                  JASON.stringify(translator.getCompiledData(locale));

          fs.writeFile(output, script, 'utf-8', nextLocale);
        }, next);
      });
    }, callback);
  });
};
