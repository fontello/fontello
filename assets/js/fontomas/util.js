/*global fontomas, _, XMLSerializer*/

;(function () {
  "use strict";


  var exports = {}, notify_dup = {};


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


  exports.notify_alert = function (text, suppress_dup) {
    var options = {"image": "/static/assets/vendor/jquery.gritter/alert.png"};
    notify(text, options, suppress_dup);
  };


  exports.notify_info = function (text, suppress_dup) {
    notify(text, {}, suppress_dup);
  };

  // ===============
  // misc functions
  // ===============
  exports.outerHtml = function (jquery_object) {
    return $("<div/>").append(jquery_object.clone()).html();
  };


  exports.getAllAttrs = function (dom_node) {
    var result = {};

    _.each(dom_node.attributes, function (attr) {
      result[attr.nodeName] = attr.nodeValue;
    });

    return result;
  };


  exports.xmlToString = function(xmlDom) {
    var result;

    // cross-browser
    result = ("undefined" === typeof XMLSerializer) ? xmlDom.xml
      : (new window.XMLSerializer()).serializeToString(xmlDom);

    result = result
      //FIXME: quickfix: get rid of unwanted xmlns insertion
      .replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, "")
      //FIXME: quickfix: remove the extra newlines
      .replace(/>(\s)*<glyph/gm, ">\n<glyph")
      //FIXME: quickfix: &amp; => &
      .replace(/&amp;#x/gm, "&#x");

    return result;
  };


  exports.getFileExt = function (filepath) {
    var index = String(filepath).lastIndexOf(".");
    return (index === -1) ? "" : filepath.substr(index+1).toLowerCase();
  };


  exports.joinList = function (array, delim1, delim2) {
    return _.reduce(array, function (prev, cur, idx, arr) {
      return prev + ((arr.length !== idx + 1) ? delim1 : delim2) + cur;
    });
  };


  // trim string at both sides:
  // in:  s="abc{hello}def", begin="c{", end="}"
  // out: "hello"
  exports.trimBoth = function (s, begin, end) {
    var idx1 = s.indexOf(begin) + begin.length, idx2 = s.lastIndexOf(end);
    return (idx1 >= idx2) ? s : s.substr(idx1, idx2 - idx1);
  };


  exports.repeat = function (s, times) {
    var result = "";

    while (0 < times) {
      result += s;
      times--;
    }

    return result;
  };


  exports.rpad = function (s, len) {
    return s + exports.repeat(" ", len - s.length);
  };


  exports.lpad = function (s, len) {
    return exports.repeat(" ", len - s.length) + s;
  };


  exports.base64_encode = function (s) {
    /*jshint bitwise:false*/
    var table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
        result = "",
        chr1, chr2, chr3, enc1, enc2, enc3, enc4,
        i, l;

    for (i = 0, l = s.length; i < l; i += 3) {
      chr1 = s.charCodeAt(i);
      chr2 = s.charCodeAt(i+1);
      chr3 = s.charCodeAt(i+2);

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      result += table.charAt(enc1) + table.charAt(enc2) + table.charAt(enc3) + table.charAt(enc4);
    }

    return result;
  };


  // see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/fromCharCode
  exports.fixedFromCharCode = function (code) {
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


  exports.fixedCharCodeAt = function (char) {
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


  fontomas.util = exports;

}());
