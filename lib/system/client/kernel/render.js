// Client-side renderer. Contains local helpers etc and calls common render
// method internally.


'use strict';


const _      = require('lodash');
const render = require('../../render/common');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {

  let DEFAULT_HELPERS = {
    runtime: N.runtime,

    t: N.runtime.t,

    asset_body: function asset_body_helper() {
      N.logger.error('asset_body() is a server-side only helper, thus can be used in base layouts only.');
      return '';
    },

    link_to: function link_to_helper(name, params) {
      return N.router.linkTo(name, params) || '#';
    },

    add_raw_data: function add_raw_data_helper(key, data) {
      if (N.runtime.page_data.hasOwnProperty(key)) {
        N.logger.warn('Override of %j key in N.runtime.page_data', key);
      }

      N.runtime.page_data[key] = data;
    }
  };


  function clientRenderWrapper(apiPath, locals, helpers) {
    if (helpers) {
      helpers = _.assign({}, DEFAULT_HELPERS, helpers);
    } else {
      helpers = DEFAULT_HELPERS;
    }

    return render(N, apiPath, locals, helpers);
  }

  clientRenderWrapper.helpers = DEFAULT_HELPERS; // Expose for extendability

  return clientRenderWrapper;
};
