// denormalize and expands flat tree:
//
//    var o = { 'foo.bar': 1, boo: 2 };
//
//    expandTree(o); // -> { foo: { bar: 1 }, 'foo.bar': 1, boo: 2 };
//
//    o.foo.bar === o['foo.bar'];


"use strict";


// 3rd-party
var traverse = require('traverse');


// internal
var deepMerge = require('./deep_merge');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (obj) {
  Object.keys(obj)
    .filter(function (k) {
      // process keys with '.' only
      return 0 <= k.indexOf('.');
    })
    .forEach(function (k) {
      var tmp = {};

      traverse.set(tmp, k.split('.'), obj[k]);
      deepMerge(obj, tmp);
    });
};
