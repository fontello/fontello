var Fontomas = (function (Fontomas) {
    var cfg = Fontomas.cfg;

    var notify = function(text, tpl, suppress_dup) {
        var tpl_vars = {
            text: text
        };
        var options = cfg.notify.options;

        if (suppress_dup && (text != undefined)) {
            if (cfg.notify.dup[text] != undefined) {
                console.log("notification suppressed");
                return;
            }

            cfg.notify.dup[text] = true;
            $.extend(options, {
                close: function () {
                    delete cfg.notify.dup[text];
                    console.log("notification can be fired again");
                }
            });
        }

        $(cfg.id.notification).notify("create", tpl, tpl_vars, options);
    };

    var notify_alert = function (text, suppress_dup) {
        notify(text,
            cfg.notify.templates.alert,
            suppress_dup
        );
    };

    var notify_info = function (text, suppress_dup) {
        notify(text,
            cfg.notify.templates.info,
            suppress_dup
        );
    };

    // ===============
    // misc functions
    // ===============
    var outerHtml = function (jquery_object) {
        return $("<div/>").append(jquery_object.clone()).html();
    };

    var getAllAttrs = function (dom_node) {
        var result = {},
            attrs = dom_node.attributes;

        for (var i=0, len=attrs.length; i<len; i++)
            result[attrs[i].nodeName] = attrs[i].nodeValue;

        return result;
    }

    var xmlToString = function(xmlDom) {
        // cross-browser
        var result = (typeof XMLSerializer!=="undefined")
            ? (new window.XMLSerializer()).serializeToString(xmlDom)
            : xmlDom.xml;
        //FIXME: quickfix: get rid of unwanted xmlns insertion
        result = result.replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g,
            "");
        //FIXME: quickfix: remove the extra newlines
        result = result.replace(/>(\s)*<glyph/gm, ">\n<glyph");
        //FIXME: quickfix: &amp; => &
        result = result.replace(/&amp;#x/gm, "&#x");
        return result;
    };

    var getFileExt = function (filepath) {
        var defaultval = "";
        if (!is_string(filepath))
            return defaultval;

        var index = filepath.lastIndexOf(".");
        if (index == -1)
            return defaultval;
        else
            return filepath.substr(index+1).toLowerCase();
    };

    var joinList = function (array, delim1, delim2) {
        return array.reduce(function (prev, cur, idx, arr) {
            return arr.length != idx+1
                ? prev + delim1 + cur
                : prev + delim2 + cur;
        });
    };

    // type functions
    var is_string = function (s) {
        return typeof s == "string";
    }

    // string functions

    // trim leading whitespaces
    var trimLeadingWS = function (s) {
        return s.replace(/^\s*/, "");
    };

    // trim string at both sides:
    // in:  s="abc{hello}def", begin="c{", end="}"
    // out: "hello"
    var trimBoth = function (s, begin, end) {
        var idx1 = s.indexOf(begin) + begin.length,
            idx2 = s.lastIndexOf(end);
        if (idx1 < idx2)
            return s.substr(idx1, idx2 - idx1);
        else
            return s;
    };

    var randomNumString = function (len) {
        var result = "";
        for (var i=0; i<(len/8)+1; i++) {
            result += Math.round(Math.random()*89999999+10000000).toString(10);
        }
        return result.substr(0, len);
    };

    var repeat = function (s, times) {
        if (times < 1)
            return "";
        var result = "";
        while (times > 0) {
            if (times & 1)
                result += s;
            times >>= 1;
            s += s;
        }
        return result;
    };

    var rpad = function (s, len) {
        if (s.length < len)
            return s + repeat(" ", len - s.length);
        else
            return s;
    };

    var lpad = function (s, len) {
        if (s.length < len)
            return repeat(" ", len - s.length) + s;
        else
            return s;
    };

    var base64_encode = function (s) {
        var table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var result = "";

        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;

        for (var i=0, len=s.length; i<len; i+=3) {
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

            result += table.charAt(enc1) + table.charAt(enc2)
                + table.charAt(enc3) + table.charAt(enc4);
        }

        return result;
    };

    // public interface
    return $.extend(true, Fontomas, {
        lib: { 
            util: {
                notify_alert: notify_alert,
                notify_info: notify_info,
                outerHtml: outerHtml,
                getAllAttrs: getAllAttrs,
                xmlToString: xmlToString,
                getFileExt: getFileExt,
                joinList: joinList,
                is_string: is_string,
                trimLeadingWS: trimLeadingWS,
                trimBoth: trimBoth,
                randomNumString: randomNumString,
                repeat: repeat,
                rpad: rpad,
                lpad: lpad,
                base64_encode: base64_encode
            }
        }
    });
})(Fontomas || {});
