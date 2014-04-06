// Client-side renderer. Contains local helpers etc and calls common render
// method internally.


'use strict';


var _      = require('lodash');
var date   = require('../../date');
var render = require('../../render/common');


////////////////////////////////////////////////////////////////////////////////


var tzOffset = (new Date()).getTimezoneOffset();


var DEFAULT_HELPERS = {
  runtime: N.runtime

, t: N.runtime.t

, date: function date_helper(value, format) {
    return date(value, format, N.runtime.locale, tzOffset);
  }

, asset_include: function assets_include_helper() {
    N.logger.error('asset_include() is a server-side only helper, ' +
                   'thus can be used in base layouts only.');
    return '';
  }

, link_to: function link_to_helper(name, params) {
    return N.runtime.router.linkTo(name, params) || '#';
  }

, add_raw_data: function add_raw_data_helper(key, data) {
    if (N.runtime.page_data.hasOwnProperty(key)) {
      N.logger.warn('Override of %j key in N.runtime.page_data');
    }

    N.runtime.page_data[key] = data;
  }
};


////////////////////////////////////////////////////////////////////////////////


module.exports = function clientRenderWrapper(apiPath, locals, helpers) {
  if (helpers) {
    helpers = _.extend({}, DEFAULT_HELPERS, helpers);
  } else {
    helpers = DEFAULT_HELPERS;
  }

  return render(N, apiPath, locals, helpers);
};
