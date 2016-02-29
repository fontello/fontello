// - get availavle locales on init stage
// - setup locale fromsession if exists
// - guess locale from browser if no session
//

'use strict';


var _ = require('lodash');


module.exports = function (N) {
  // Enabled locales map of `normalized -> original` pairs.
  //
  //   { 'ru-ru': 'ru-RU', 'en': 'en-US' }
  //
  var enabledLocalesMap = {};


  // RegExp used to extract language quality
  //
  var QUALITY_RE = /^q=([0-9.]+)$/;


  // Parses Accept-Language header string into array of locale names sorted by
  // quality and with appended zone-less fallback for each language.
  //
  //   'en-US;q=0.8,en-GB,ru-RU' -> [ 'en-gb', 'en-us', 'en', 'ru-ru', 'ru' ]
  //
  // NOTE: We limit amount of variant to maximum 10 elements.
  //
  function getAcceptedLanguages(string) {
    var tmp = String(string)
            // remove any whitespace that might appear according to RFC:
            // http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.4
            .replace(/\s+/g, '')
            .split(',')
            // Limit list to 10 for safety
            .slice(0, 10);

    return _(tmp)
              // parse partials
              // [ 'en-US;q=0.8', 'en-GB', 'ru-RU' ]
              .map(function (str) {
                var q = 1,
                    parts = str.split(';', 2);

                if (QUALITY_RE.test(parts[1])) {
                  var qval = parseFloat(parts[1].match(QUALITY_RE)[1]);
                  if (!isNaN(qval)) { q = qval; }
                }

                return {
                  locale: parts[0].toLowerCase(),
                  quality: q
                };
              })
              .sortBy(tmp, 'quality')
              .map('locale')
              // cleanup garbage
              .compact()
              .uniq()
              .value();
  }


  // find first matching locale from the list of accepted languages
  //
  function findAcceptedLanguage(req) {
    var locales, i, l;

    if (req && req.headers && req.headers['accept-language']) {
      locales = getAcceptedLanguages(req.headers['accept-language']);

      for (i = 0; i < locales.length; i++) {
        l = locales[i];
        if (enabledLocalesMap[l]) return l;
      }

      // if not found - try second pass, with stripped language zones
      for (i = 0; i < locales.length; i++) {
        l = locales[i].split('-', 2)[0];
        if (enabledLocalesMap[l]) return l;
      }
    }
  }


  ////////////////////////////////////////////////////////////////////////////////


  // Fill enabled locales map on INIT stage. (all i18n is done in bundler)
  //
  N.wire.after('init:bundle', function locale_set_prepare(N) {

    // Add full locale names to the map.
    N.config.locales.forEach(function (locale) {
      enabledLocalesMap[locale.toLowerCase()] = locale;
    });

    // Add zone-less locale aliases like 'en' for 'en-US'.
    N.config.locales.forEach(function (locale) {
      var languageId = locale.toLowerCase().split('-')[0];

      if (!enabledLocalesMap[languageId]) {
        enabledLocalesMap[languageId] = locale;
      }
    });
  });


  // - load locale from session if possible
  // - fallback to browser/default
  // - update session if exists
  //
  N.wire.before('server_chain:*', { priority: -60 }, function locale_set(env) {
    var locale,
        enabled = N.config.locales;

    // First of all look for locale in the session.
    if (env.session && env.session.locale) {
      locale = env.session.locale;
    }

    // If not found, try to fetch it from plain cookies.
    if (enabled.indexOf(locale) < 0) {
      locale = env.extras.getCookie('locale');

      // At least try to detect locale from the browser preferences.
      if (enabled.indexOf(locale) < 0) {
        locale = enabledLocalesMap[findAcceptedLanguage(env.origin.req)];

        // If proper locale is still not found, fallback to the default one.
        if (enabled.indexOf(locale) < 0) {
          locale = N.config.locales[0];
        }
      }
    }

    if (env.session) {
      env.session.locale = locale;
    }
  });


  // Copy locale to runtime for use in the browser
  //
  N.wire.after('server_chain:http:*', function fill_runtime_locale(env) {
    // get locale from session (use default one if session doesn't exist)
    var locale;

    if (env.session && env.session.locale) {
      locale = env.session.locale;
    } else {
      locale = N.config.locales[0];
    }

    env.runtime.locale = locale;
  });
};
