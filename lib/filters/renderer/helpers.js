"use strict";


/*global N, _*/


// N
var JASON = require('nlib').Vendor.JASON;


////////////////////////////////////////////////////////////////////////////////


var helpers = module.exports = {};


////////////////////////////////////////////////////////////////////////////////


// returns asset source
helpers.asset_include = function asset_include(path) {
  var asset = N.runtime.assets.environment.findAsset(path);
  return !asset ? "" : asset.toString();
};


// returns link for the api path `name`
helpers.link_to = function (name, params) {
  return N.runtime.router.linkTo(name, params) || '#';
};


// N reference
helpers.N = function (path) {
  return !path ? N : N.shared.getByPath(N, path);
};


// JSON alike serializer (but that treats RegExps, Function as they are)
helpers.jason = JASON.stringify;
