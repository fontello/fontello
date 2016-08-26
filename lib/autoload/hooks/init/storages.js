// Init storages for downloads & shortlinks
//
'use strict';


const level  = require('level');
const ttl    = require('level-ttl');
const join   = require('path').join;
const mkdirp = require('mkdirp');


module.exports = function (N) {
  let downloads = join(N.mainApp.root, 'db', `downloads-${N.environment}`);

  mkdirp.sync(downloads);

  N.downloads = ttl(level(downloads));

  let shortlinks = join(N.mainApp.root, 'db', `shortlinks-${N.environment}`);

  mkdirp.sync(shortlinks);

  N.shortlinks = ttl(level(shortlinks));
};
