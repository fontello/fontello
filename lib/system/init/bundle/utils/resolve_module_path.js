'use strict';


const _       = require('lodash');
const path    = require('path');
//  Alternative to node's `require.resolve`, with ability to define root path
//  + memoise, that boosts speed
const resolve = _.memoize(require('resolve').sync, JSON.stringify);


module.exports = function (fromRoot, toFile) {
  let first = toFile.split(/[\/\\]/)[0];

  if (first === '.' || first === '..') {
    toFile = path.resolve(fromRoot, toFile);
  }

  try {
    return resolve(toFile, { basedir: fromRoot });
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') throw err;
    return null;
  }
};
