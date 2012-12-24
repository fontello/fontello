/**
 *  Support.tree
 *
 *  Collection of tools that to set/get properties of an objects using
 *  dot-separated `paths` as keys.
 *
 *
 *  ##### Example
 *
 *      tree.get({foo: {bar: 123}}, 'foo.bar');
 *      // -> 123
 **/


'use strict';


// 3rd-party
var traverse  = require('traverse');
var Types     = require('types');


////////////////////////////////////////////////////////////////////////////////


// internal cache
var cache = new Types.Hash(false);


// return paths cache. create if needed
function getCache(tree) {
  var data = cache.get(tree);

  if (false === data) {
    data = {};
    cache.store(tree, data);
  }

  return data;
}


////////////////////////////////////////////////////////////////////////////////


/**
 *  Support.tree.set(obj, key, val) -> Void
 *  - obj (Object): Object to test
 *  - key (String): Path to the property
 *  - val (Mixed): Value of the `key`
 *
 *  Sets `val` as `key` of `obj`.
 *
 *
 *  ##### Example
 *
 *      var data = {};
 *
 *      Support.tree.set(data, 'foo.bar', true);
 *      console.log(123 === data.foo.bar); // -> true
 *
 *
 *  ##### See Also
 *
 *  - [[Support.tree.cache.set]]
 **/
function setWithoutCache(obj, key, val) {
  traverse.set(obj, String(key).split('.'), val);
}


/**
 *  Support.tree.get(obj, key, defaultValue) -> Mixed
 *  - obj (Object): Object to test
 *  - key (String): Path to the property
 *  - defaultValue (Mixed): Returned if `key` is not found
 *
 *  Returns value of a `key` inside of `obj`. If `obj` has no such key, returns
 *  `defaultValue` instead.
 *
 *
 *  ##### Example
 *
 *      var data = { foo: { bar: 123 } };
 *
 *      Support.tree.get(data, 'foo.bar');
 *      // -> 123
 *
 *      Support.tree.get(data, 'foo.moo');
 *      // -> undefined
 *
 *      Support.tree.get(data, 'foo.moo', 'Hooray!);
 *      // -> 'Hooray!'
 *
 *
 *  ##### See Also
 *
 *  - [[Support.tree.cache.get]]
 **/
function getWithoutCache(obj, key, defaultValue) {
  return traverse.get(obj, String(key).split('.')) || defaultValue;
}


/**
 *  Support.tree.has(obj, key) -> Boolean
 *  - obj (Object): Object to test
 *  - key (String): Path to the property
 *
 *  Tells whenever or not given `key` exists in the `obj`.
 *
 *
 *  ##### Example
 *
 *      var data = { foo: { bar: 123 } };
 *
 *      Support.tree.has(data, 'foo.bar');
 *      // -> true
 *
 *      Support.tree.get(data, 'foo.moo');
 *      // -> false
 *
 *
 *  ##### See Also
 *
 *  - [[Support.tree.cache.has]]
 **/
function hasWithoutCache(obj, key) {
  return traverse.has(obj, String(key).split('.'));
}


/**
 *  Support.tree.cache
 *
 *  Contains same API as [[Support.tree]] module, but caches results.
 **/


/**
 *  Support.tree.cache.set(obj, key, val) -> Void
 *  - obj (Object): Object to test
 *  - key (String): Path to the property
 *  - val (Mixed): Value of the `key`
 *
 *  Sets `val` as `key` of `obj` and update internal cache.
 *
 *
 *  ##### See Also
 *
 *  - [[Support.tree.set]]
 **/
function setWithCache(obj, key, val) {
  setWithoutCache(obj, key, val);
  getCache(obj)[key] = val;
}


/**
 *  Support.tree.cache.get(obj, key, defaultValue) -> Mixed
 *  - obj (Object): Object to test
 *  - key (String): Path to the property
 *  - defaultValue (Mixed): Returned if `key` is not found
 *
 *  Returns value of a `key` inside of `obj`. If `obj` has no such key, returns
 *  `defaultValue` instead. Result is cached in the internal cache.
 *
 *
 *  ##### See Also
 *
 *  - [[Support.tree.get]]
 **/
function getWithCache(obj, key, defaultValue) {
  var val = getCache(obj)[key];

  if (undefined === val) {
    val = getCache(obj)[key] = getWithoutCache(obj, key);
  }

  return val || defaultValue;
}


/**
 *  Support.tree.cache.has(obj, key) -> Boolean
 *  - obj (Object): Object to test
 *  - key (String): Path to the property
 *
 *  Tells whenever or not given `key` exists in the `obj`.
 *  Result is cached in the internal cache.
 *
 *
 *  ##### See Also
 *
 *  - [[Support.tree.has]]
 **/
function hasWithCache(obj, key) {
  return !!getWithCache(obj, key);
}


////////////////////////////////////////////////////////////////////////////////


module.exports.set        = setWithoutCache;
module.exports.get        = getWithoutCache;
module.exports.has        = hasWithoutCache;
module.exports.cache      = Object(null);
module.exports.cache.set  = setWithCache;
module.exports.cache.get  = getWithCache;
module.exports.cache.has  = hasWithCache;
