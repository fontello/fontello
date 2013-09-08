// Resolves `toFile` path. If it's a relative path (e.g. "../../file"), it will
// be resolved relative to `fromRoot`. Otherwise `require.resolve` is used.
//
// WARNING: `require.resolve` searches for modules from 'nodeca.core' and
// upper. If you embed any dependences into your application locally,
// expect problems with "non-existent modules".


'use strict';


var path = require('path');

var _    = require('lodash');

//  Alternative to node's `require.resolve`, with ability to define root path
//  + memoise, that boosts speed
var resolve = _.memoize(
  require('resolve').sync,
  JSON.stringify
);

////////////////////////////////////////////////////////////////////////////////


module.exports = function (fromRoot, toFile) {
  var first = toFile.split(/[\/\\]/)[0];

  if ('.' === first || '..' === first) {
    toFile = path.resolve(fromRoot, toFile);
  }

  try {
    return resolve(toFile, { basedir: fromRoot });
  } catch (err) {
    return null;
  }
};
