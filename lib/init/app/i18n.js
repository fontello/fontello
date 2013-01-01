// `i18n` section processor
//


'use strict';


/*global underscore, N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _         = underscore;
var BabelFish = require('babelfish');
var fstools   = require('fs-tools');


// internal
var stopwatch   = require('./utils/stopwatch');
var serialize   = require('../../jetson').serialize;


////////////////////////////////////////////////////////////////////////////////


// similar to _.extend but recursive
function deepMerge(dst, src) {
  dst = dst || {};

  _.each(src, function (val, key) {
    if (_.isObject(dst[key]) && _.isObject(val)) {
      deepMerge(dst[key], val);
    } else {
      dst[key] = val;
    }
  });

  return dst;
}

//  collectTranslations(pathnames, locales) -> Object
//  - pathnames (Array)
//  - locales (Array)
//
// Reads pathanmes and builds translations tree.
// Populates locales with found locales
//
function collectTranslations(pathnames, locales) {
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
      if (-1 === locales.indexOf(locale)) {
        locales.push(locale);
      }

      if (!translations[locale]) {
        translations[locale] = {};
      }

      if (!translations[locale][pathname.apiPath]) {
        translations[locale][pathname.apiPath] = {};
      }

      deepMerge(translations[locale][pathname.apiPath], phrases);
    });
  });

  return translations;
}


//  initLocales(knownLocales) -> Void
//  - knownLocales (Array): List of found locales filled by collectTranslations
//
//  Initialize, validate and auto-fill (if needed) N.config.locales
//
function initLocales(knownLocales) {
  var
  localesConfig   = N.config.locales || (N.config.locales = {}),
  enabledLocales  = localesConfig['enabled'] ? localesConfig['enabled']
                  : knownLocales,
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


//  initServerI18n(tree)
//  - tree (Object): Translation prepared by collectTranslations
//
//  Initialize server N.runtime.i18n and populate it with translations.
//  Client and server translations are merged together for server translator,
//  but server phrases takes precedence over client
//
function initServerI18n(tree) {
  var united = {};

  _.each(tree, function (branch) {
    deepMerge(united, branch.client);
    deepMerge(united, branch.server);
  });

  N.runtime.i18n = new BabelFish(N.config.locales['default']);

  _.each(N.config.locales['enabled'], function (locale) {
    _.each(united[locale] || {}, function (data, scope) {
      N.runtime.i18n.addPhrase(locale, scope, data);
    });
  });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, sandbox, callback) {
  var
  config  = sandbox.config,
  timer   = stopwatch(),
  locales = [], // array of known locales
  tree    = {};

  try {
    // collect translations of all packages in a common tree
    _.each(config.packages, function (pkgConfig, pkgName) {
      var
      server_files = (pkgConfig.i18n_server || {}).files  || [],
      client_files = (pkgConfig.i18n_client || {}).files  || [];

      tree[pkgName] = {
        server: collectTranslations(server_files, locales),
        client: collectTranslations(client_files, locales)
      };
    });

    // tree ->
    //
    //    <pkgName>:
    //      client:
    //        <locale>:
    //          <phrase>:
    //            <phrase>: translation
    //            ...
    //          <phrase>: translation
    //          ...
    //        ...
    //      server:
    //        ...
    //
    //    tree['fontello']['client']['en-US']['app']['title']

    initLocales(locales);
    initServerI18n(tree);

    // create client-side i18n bundles for each package/locale
    _.keys(config.packages).forEach(function (pkgName) {
      var
      i18n    = new BabelFish(N.config.locales['default']),
      branch  = tree[pkgName].client,
      outdir  = path.join(tmpdir, 'i18n', pkgName);

      fstools.mkdirSync(outdir);

      // fill in data of all enabled locales
      _.each(N.config.locales['enabled'], function (locale) {
        _.each(branch[locale] || {}, function (data, scope) {
          i18n.addPhrase(locale, scope, data);
        });
      });

      // flush out compiled phrases
      _.each(N.config.locales['enabled'], function (locale) {
        var
        outfile = path.join(outdir, locale + '.js'),
        source  = 'N.runtime.i18n.load(' +
                  JSON.stringify(locale) + ',' +
                  serialize(i18n.getCompiledData(locale)) + ');';

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
