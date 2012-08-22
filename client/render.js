'use strict';


/**
 *  client
 **/

/**
 *  client.common
 **/


/*global window, $, _, JASON, nodeca*/


////////////////////////////////////////////////////////////////////////////////


var tzOffset       = (new Date).getTimezoneOffset();
var helpers        = {};


////////////////////////////////////////////////////////////////////////////////


helpers.t = nodeca.runtime.t;


helpers.date = function (value, format) {
  return nodeca.shared.common.date(value, format, nodeca.runtime.locale, tzOffset);
};

_.each(['asset_path', 'asset_include'], function (method) {
  helpers[method] = function () {
    throw method + '() is a server-side only helper, thus can be used in base layouts only.';
  };
});

helpers.link_to = function (name, params) {
  return nodeca.runtime.router.linkTo(name, params) || '#';
};

helpers.nodeca = function (path) {
  return !path ? nodeca : nodeca.shared.common.getByPath(nodeca, path);
};

// substitute JASON with JSON
helpers.jason = JSON.stringify;


////////////////////////////////////////////////////////////////////////////////


/**
 *  client.common.render(apiPath[, locals[, layout]]) -> Void
 *  - apiPath (String): Server method API path.
 *  - locals (Object): Locals data for the renderer
 *  - layout (String): Layout or layouts stack
 *
 *  Renders view.
 **/
module.exports = function render(apiPath, locals, layout) {
  if (!nodeca.shared.common.getByPath(nodeca.views, apiPath)) {
    throw new Error("View " + apiPath + " not found");
  }

  locals = _.extend(locals || {}, helpers);
  return nodeca.shared.common.render(nodeca.views, apiPath, locals, layout, true);
};
