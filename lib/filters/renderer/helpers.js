"use strict";


/*global nodeca, _*/


// nodeca
var HashTree = require('nlib').Support.HashTree;
var JASON    = require('nlib').Vendor.JASON;


////////////////////////////////////////////////////////////////////////////////


var helpers = module.exports = {};


////////////////////////////////////////////////////////////////////////////////


// returns asset source
helpers.asset_include = function asset_include(path) {
  var asset = nodeca.runtime.assets.environment.findAsset(path);
  return !asset ? "" : asset.toString();
};


// returns link for the api path `name`
helpers.link_to = function (name, params) {
  return nodeca.runtime.router.linkTo(name, params) || '#';
};


// nodeca reference
helpers.nodeca = function (path) {
  return !path ? nodeca : nodeca.shared.common.getByPath(nodeca, path);
};


// JSON alike serializer (but that treats RegExps, Function as they are)
helpers.jason = JASON.stringify;
