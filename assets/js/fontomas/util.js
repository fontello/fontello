/*global fontomas, $, _*/

;(function () {
  "use strict";


  fontomas.util = {};


  fontomas.util.notify_alert = function (text) {
    // FIXME: title is mandatory, so we've filled it with just a space
    $.gritter.add({
      time:   4000,
      image:  "/static/assets/img/alert.png",
      title:  " ",
      text:   text
    });
  };


  // ===============
  // misc functions
  // ===============
  // see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/fromCharCode
  fontomas.util.fixedFromCharCode = function (code) {
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


  fontomas.util.fixedCharCodeAt = function (char) {
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

}());
