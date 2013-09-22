// Different helpers, used in several places
//
'use strict';


// Int to char, with fix for big numbers
// see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/fromCharCode
//
exports.fixedFromCharCode = function (code) {
  /*jshint bitwise: false*/
  if (code > 0xffff) {
    code -= 0x10000;

    var surrogate1 = 0xd800 + (code >> 10)
      , surrogate2 = 0xdc00 + (code & 0x3ff);

    return String.fromCharCode(surrogate1, surrogate2);
  } else {
    return String.fromCharCode(code);
  }
};


// Char to Int, with fix for big numbers
//
exports.fixedCharCodeAt = function (chr) {
  /*jshint bitwise: false*/
  var char1 = chr.charCodeAt(0)
    , char2 = chr.charCodeAt(1);

  if ((chr.length >= 2) &&
      ((char1 & 0xfc00) === 0xd800) &&
      ((char2 & 0xfc00) === 0xdc00)) {
    return 0x10000 + ((char1 - 0xd800) << 10) + (char2 - 0xdc00);
  } else {
    return char1;
  }
};
