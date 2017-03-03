// Define simple `t` helpers. We do not use translations now.
//
'use strict';


const env_factory = require('../../../../system/env');


module.exports = function (N) {

  env_factory.helpers.t = function translate_helper(phrase, params) {
    return N.i18n.t(N.config.locales[0], phrase, params);
  };

  env_factory.helpers.t_exists = function translate_exists_helper(phrase) {
    return N.i18n.hasPhrase(N.config.locales[0], phrase);
  };

};
