// Server-side views renderer helpers
// TODO: Put helpers into `lib/render/helpers` and make them client/server aware


"use strict";


/*global N*/


////////////////////////////////////////////////////////////////////////////////


var helpers = module.exports = {};


////////////////////////////////////////////////////////////////////////////////


// returns asset source
helpers.asset_include = function asset_include(path) {
  var asset = N.runtime.assets.environment.findAsset(path);

  try {
    return !asset ? "" : asset.toString();
  } catch (err) {
    N.logger.error("Failed inline asset " + path + ":\n" +
                   (err.stack || err.message || err));
    return "";
  }
};


// returns link for the api path `name`
helpers.link_to = function (name, params) {
  return N.runtime.router.linkTo(name, params) || '#';
};


// N reference
helpers.N = N;
