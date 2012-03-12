var Fontomas = (function (_, XMLSerializer, Fontomas) {
  "use strict";

  var exports = {}, config = Fontomas.cfg;

  function notify(tpl, text, suppress_dup) {
    var tpl_vars = {text: text},
        options  = config.notify.options;

    if (suppress_dup && (text !== undefined)) {
      if (config.notify.dup[text] !== undefined) {
        console.log("notification suppressed");
        return;
      }

      config.notify.dup[text] = true;

      $.extend(options, {
        close: function () {
          delete config.notify.dup[text];
          console.log("notification can be fired again");
        }
      });
    }

    $('#notifications-container').notify("create", tpl, tpl_vars, options);
  }

  exports.notify_alert = function (text, suppress_dup) {
    notify(config.notify.templates.alert, text, suppress_dup);
  };

  exports.notify_info = function (text, suppress_dup) {
    notify(config.notify.templates.info, text, suppress_dup);
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
      times -= 1;
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

  return $.extend(true, Fontomas, {util: exports});
}(window._, window.XMLSerializer, Fontomas || {}));
