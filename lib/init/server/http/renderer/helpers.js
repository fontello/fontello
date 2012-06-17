"use strict";


/*global nodeca, _*/


// stdlib
var crypto = require('crypto');


// nodeca
var HashTree = require('nlib').Support.HashTree;


// internal
var realtime = require('../../realtime');


////////////////////////////////////////////////////////////////////////////////


var helpers = module.exports = {};


////////////////////////////////////////////////////////////////////////////////


helpers.asset_path = function asset_path(path) {
  var asset = nodeca.runtime.assets.environment.findAsset(path);
  return !asset ? "#" : ("/assets/" + asset.digestPath);
};


helpers.asset_include = function asset_include(path) {
  var asset = nodeca.runtime.assets.environment.findAsset(path);
  return !asset ? "" : asset.toString();
};


helpers.config = function (part) {
  return !part ? nodeca.config : HashTree.get(nodeca.config, part);
};


helpers.count_online_users = function () {
  return realtime.activeClients + 1;
};


// crypto-strong random 128 bit string
helpers.random = function () {
  var rnd = crypto.randomBytes(16);
  return crypto.createHash('md5').update(rnd).digest('hex');
};


helpers.link_to = function (name, params) {
  return nodeca.runtime.router.linkTo(name, params) || '#';
};
