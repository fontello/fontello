// Override translation helpers
//

'use strict';


module.exports = function (N) {
  var helpers = require('../../../../lib/system/env').helpers;

  helpers.t = function translate_helper(phrase, params) {
    return N.i18n.t(N.config.locales[0], phrase, params);
  };

  helpers.t_exists = function translate_exists_helper(phrase) {
    return N.i18n.hasPhrase(N.config.locales[0], phrase);
  };
};
