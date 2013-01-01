// Small utility belt for JS serialization
//
// Used instead of JASON as we needed a better serialization support for
// regexps, functions and dates. And After all it's even ligther.


'use strict';


function isObject(obj) {
  return '[object Object]' === Object.prototype.toString.call(obj);
}


function isFunction(obj) {
  return '[object Function]' === Object.prototype.toString.call(obj);
}


function isArray(obj) {
  return '[object Array]' === Object.prototype.toString.call(obj);
}


function isRegExp(obj) {
  return '[object RegExp]' === Object.prototype.toString.call(obj);
}


function isDate(obj) {
  return '[object Date]' === Object.prototype.toString.call(obj);
}


function each(arr, iter) {
  var i, l;

  for (i = 0, l = arr.length; i < l; i++) {
    iter(arr[i]);
  }
}


// http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
var getKeys = Object.keys || (function () {
  var
  hasOwn          = Object.prototype.hasOwnProperty,
  hasDontEnumBug  = !{toString: null}.propertyIsEnumerable("toString"),
  DontEnums       = [
    'toString',
    'toLocaleString',
    'valueOf',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'constructor'
  ],
  DontEnumsLength = DontEnums.length;

  return function (o) {
    var result = [];

    if (!isObject(o) && !isFunction(o)) {
      throw new TypeError("Object.keys called on a non-object");
    }

    for (var name in o) {
      if (hasOwn.call(o, name)) {
        result.push(name);
      }
    }

    if (hasDontEnumBug) {
      for (var i = 0; i < DontEnumsLength; i++) {
        if (hasOwn.call(o, DontEnums[i])) {
          result.push(DontEnums[i]);
        }
      }
    }

    return result;
  };
})();


////////////////////////////////////////////////////////////////////////////////


function serializeArray(obj, keys) {
  var chunks = [];

  each(obj, function (val) {
    chunks.push(exports.serialize(val, keys));
  });

  return '[' + chunks.join(',') + ']';
}


function serializeObject(obj, keys) {
  var chunks = [];

  // always deal with sorted list of keys
  each((keys || getKeys(obj)).sort(), function (k) {
    var key, subkeys;

    if (!isArray(k)) {
      key = k;
    } else {
      k       = k.slice();
      key     = k.shift();
      subkeys = k.pop();
    }

    chunks.push(JSON.stringify(key) + ':' +
                exports.serialize(obj[key], subkeys));
  });

  return '{' + chunks.join(',') + '}';
}


////////////////////////////////////////////////////////////////////////////////


exports.serialize = function (obj, keys) {
  if (isFunction(obj)) {
    return obj.toString();
  }

  if (isRegExp(obj)) {
    return 'new RegExp(' + JSON.stringify(obj.source) + ')';
  }

  if (isDate(obj)) {
    return 'new Date("' + String(obj) + '")';
  }

  if (isArray(obj)) {
    return serializeArray(obj, keys);
  }

  if (isObject(obj)) {
    return serializeObject(obj, keys);
  }

  return JSON.stringify(obj);
};
