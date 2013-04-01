// Client-side renderer. Contains local helpers etc and calls common render
// method internally.


'use strict';


var _      = require('lodash');
var date   = require('../../date');
var render = require('../../render/common');

// Expose jade runtime to `window.jade`
require('./jade_runtime.js');


////////////////////////////////////////////////////////////////////////////////


var tzOffset = (new Date).getTimezoneOffset();


////////////////////////////////////////////////////////////////////////////////


/**
 *  render(apiPath[, locals[, helpers]]) -> String
 *  - apiPath (String): Template to render, e.g. `forum.index`
 *  - locals (Object): Locals data to pass to the renderer function
 *  - helpers (Object): Helper functions and constants
 *
 *  Renders a template passing `locals` and `helpers` as `self` object within
 *  it. The difference between these is that `locals` is only for the specified
 *  template, but `helpers` passes forward to partials.
 **/
function renderWrapper(apiPath, locals, helpers) {
  var _helpers = {};

  _helpers.runtime = N.runtime;

  _helpers.t = N.runtime.t;

  _helpers.date = function dateWrapper(value, format) {
    return date(value, format, N.runtime.locale, tzOffset);
  };

  _helpers.asset_include = function assetsIncludeWrapper() {
    N.logger.error('asset_include() is a server-side only helper, ' +
                   'thus can be used in base layouts only.');
    return '';
  };

  _helpers.link_to = function linkToWrapper(name, params) {
    return N.runtime.router.linkTo(name, params) || '#';
  };

  _.extend(_helpers, helpers);

  return render(N, apiPath, locals, _helpers);
}


module.exports = renderWrapper;
