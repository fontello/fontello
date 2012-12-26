'use strict';


/**
 *  client
 **/


/*global window, $, N*/


// 3rd-party
var _ = N.runtime.underscore;


var render    = require('./common');
var getByPath = require('../util').getByPath;


////////////////////////////////////////////////////////////////////////////////


var tzOffset       = (new Date).getTimezoneOffset();
var helpers        = {};


////////////////////////////////////////////////////////////////////////////////


helpers.t = N.runtime.t;


_.each(['asset_path', 'asset_include'], function (method) {
  helpers[method] = function () {
    throw method + '() is a server-side only helper, thus can be used in base layouts only.';
  };
});

helpers.link_to = function (name, params) {
  return N.runtime.router.linkTo(name, params) || '#';
};

helpers.N = function (path) {
  return !path ? N : getByPath(N, path);
};

// substitute JASON with JSON
helpers.jason = JSON.stringify;


////////////////////////////////////////////////////////////////////////////////


/**
 *  client.render(apiPath[, locals[, layout]]) -> Void
 *  - apiPath (String): Server method API path.
 *  - locals (Object): Locals data for the renderer
 *  - layout (String): Layout or layouts stack
 *
 *  Renders view.
 **/
module.exports = function (apiPath, locals, layout) {
  if (!getByPath(N.views, apiPath)) {
    throw new Error("View " + apiPath + " not found");
  }

  locals = _.extend(locals || {}, helpers);
  return render(N.views, apiPath, locals, layout, true);
};
