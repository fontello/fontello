"use strict";


//  getByPath(obj, path) -> Mixed
//  - obj (Object): Object to get value from
//  - path (String): Path of a property
//
//  Extracts property from more than one level down, via a `.` delimited
//  string of property names.
//
//
//  ##### Example
//
//      getByPath({foo: {bar: 123}}, 'foo.bar');
//      // => 123
//
module.exports.getByPath = function getByPath(obj, path) {
  var parts = path.split('.');

  // this is the fastest way to find nested value:
  // http://jsperf.com/find-object-deep-nested-value

  while (obj && parts.length) {
    obj = obj[parts.shift()];
  }

  return obj;
};


// Int to char, with fix for big numbers
// see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/fromCharCode
module.exports.fixedFromCharCode = function (code) {
  /*jshint bitwise: false*/
  if (code > 0xffff) {
    code -= 0x10000;
    var surrogate1 = 0xd800 + (code >> 10),
        surrogate2 = 0xdc00 + (code & 0x3ff);
    return String.fromCharCode(surrogate1, surrogate2);
  } else {
    return String.fromCharCode(code);
  }
};


// Char to Int, with fix for big numbers
module.exports.fixedCharCodeAt = function (char) {
  /*jshint bitwise: false*/
  var char1 = char.charCodeAt(0),
      char2 = char.charCodeAt(1);

  if ((char.length >= 2) &&
      ((char1 & 0xfc00) === 0xd800) &&
      ((char2 & 0xfc00) === 0xdc00)) {
    return 0x10000 + ((char1 - 0xd800) << 10) + (char2 - 0xdc00);
  } else {
    return char1;
  }
};
