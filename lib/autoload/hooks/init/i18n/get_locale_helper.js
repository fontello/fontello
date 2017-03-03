// - get available locales on init stage
// - setup locale from cookies if exists
// - guess locale from browser (headers) if no cookies
// - use default locale in other cases
//
'use strict';


const Negotiator  = require('negotiator');
const env_factory = require('../../../../system/env');


module.exports = function (N) {

  ////////////////////////////////////////////////////////////////////////////////
  // Add helper to env
  //
  env_factory.initHandlers.push(env => {
    env.helpers.getLocale  = function () {
      // Use locale from cookies if presented and valid
      //
      if (env.extras.getCookie) {
        let locale = env.extras.getCookie('locale');

        if (N.config.locales.indexOf(locale) !== -1) return locale;
      }

      // Try autodetect by browser headers
      //
      let negotiator = new Negotiator(env.origin.req);

      let sortedLocales = negotiator.languages(N.config.locales);

      if (sortedLocales.length) return sortedLocales[0];


      // Use default in other cases
      //
      return N.config.locales[0];
    };
  });


  ////////////////////////////////////////////////////////////////////////////////
  // Fill locale to runtime for use in the browser
  //
  N.wire.after('server_chain:http:*', function fill_runtime_locale(env) {
    env.runtime.locale = env.helpers.getLocale();
  });
};
