/*global fontomas, $, _*/

;(function () {
  "use strict";


  var notify_dup = {};


  function notify(text, extra_options, suppress_dup) {
    var options = {time: 4000};

    if (suppress_dup && (text !== undefined)) {
      if (notify_dup[text] !== undefined) {
        return;
      }

      notify_dup[text] = true;

      $.extend(options, {
        after_close: function () {
          delete notify_dup[text];
        }
      });
    }

    // FIXME: title is mandatory, so we've filled it with just a space
    $.extend(options, {title: " ", text: text}, extra_options);
    $.gritter.add(options);
  }


  fontomas.util = {};


  fontomas.util.notify_alert = function (text, suppress_dup) {
    var options = {"image": "/static/assets/img/alert.png"};
    notify(text, options, suppress_dup);
  };


  fontomas.util.notify_info = function (text, suppress_dup) {
    notify(text, {}, suppress_dup);
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
