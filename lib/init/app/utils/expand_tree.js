// denormalize and expands flat tree:
//
//    var o = { 'foo.bar': 1, boo: 2 };
//
//    expandTree(o); // -> { foo: { bar: 1 }, 'foo.bar': 1, boo: 2 };
//
//    o.foo.bar === o['foo.bar'];


"use strict";


/*global underscore*/


// 3rd-party
var _ = underscore;


////////////////////////////////////////////////////////////////////////////////


module.exports = function (obj) {
  _.chain(obj).keys().tap(function (arr) {
    return arr.sort();
  }).filter(function (key) {
    return 0 <= key.indexOf(".");
  }).each(function (key) {
    var tmp = obj, parts = key.split('.'), k;

    while (1 < parts.length) {
      k = parts.shift();
      tmp[k] = tmp[k] || {};
    }

    tmp[parts.pop()] = obj[key];
  });
};
