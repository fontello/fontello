var Fontomas = (function (Fontomas) {
    var debug = Fontomas.debug,
        util = Fontomas.lib.util;

    var Font = function () {
        if (this instanceof Font) {
            $.extend(this, arguments[0]);
        } else {
            var type = arguments[0];
            var data = arguments[1];

            switch (type) {
            case "svg":
                return Font.initSvg(data);

            case "cufonjs":
                return Font.initCufonJs(data);
            }

            return null;
        }
    };

    Font.initSvg = function (svg) {
        console.log("Font.initSvg");
        var font = {};

        var xml = null;
        try {
            xml = $.parseXML(svg);
        } catch (e) {
            console.log("Font.initSvg: invalid xml");
            return null;
        }

        font.horiz_adv_x = parseInt($("font:first", xml).attr("horiz-adv-x"))
            || 1000;
        font.ascent = parseInt($("font-face:first", xml).attr("ascent")) || 750;
        font.descent = parseInt($("font-face:first", xml).attr("descent"))
                || -250;
        font.units_per_em = parseInt($("font-face:first", xml)
            .attr("units-per-em")) || 1000;
        font.id = $("font:first", xml).attr("id") || "unknown";

        font.glyphs = {};
        $("glyph", xml).filter(function (index) {
            // debug
            return debug.is_on && debug.maxglyphs && index < debug.maxglyphs
                || true;
        }).each(function (i) {
            var glyph = util.getAllAttrs(this);
            if (glyph["horiz-adv-x"]) {
                glyph.horiz_adv_x = parseInt(glyph["horiz-adv-x"]);
                delete glyph["horiz-adv-x"];
            }

            font.glyphs[i+1] = glyph;   // 1 based
        });

        return new Font(font);
    };

    Font.initCufonJs = function (js) {
        console.log("initCufonJs");
        var font = {};

        // strip function call
        var json_string = util.trimBoth(js, ".registerFont(", ")");

        var json = null;
        try {
            json = $.parseJSON(json_string);
        } catch (e) {
            console.log("Font.initCufonJs: invalid json");
            return null;
        }

        font.horiz_adv_x = json.w || 1000;
        font.ascent = json.face.ascent || 750;
        font.descent = json.face.descent || -250;
        font.units_per_em = json.face["units-per-em"] || 1000;
        font.id = json.face["font-family"] || "unknown";

        font.glyphs = {};
        var num_glyphs = 0;
        for (var i in json.glyphs) {
            num_glyphs++;
            // debug
            if (debug.is_on && debug.maxglyphs && debug.maxglyphs < num_glyphs)
                break;

            var glyph = json.glyphs[i];
            glyph.unicode = i;

            if (glyph.w) {
                glyph.horiz_adv_x = glyph.w;
                delete glyph.w
            }
            if (glyph.d)
                // fix y coord and convert vml path to svg path
                glyph.d = Font.vmlToSvgPath(Font.vmlNegateY(glyph.d));

            font.glyphs[num_glyphs] = glyph;    // 1 based
        };

        return new Font(font);
    };

    Font.vmlToSvgPath = function (vml) {
        var path = "";
        if (vml)
            path = "M" + vml.replace(/[mlcxtrv]/g, function (command) {
                return {l: "L", c: "C", x: "z", t: "m", r: "l", v: "c"}[command]
                    || "M";
            }) + "z";
        return path;
    };

    Font.vmlNegateY = function (vml) {
        if (!vml)
            return vml;

        var result = "", re = /^([^a-z]*)/, re2 = /([mrvxe])([^a-z]*)/g, match;
        match = re.exec(vml);
        var c = match[1].split(',');
        c = c.map(function(value, idx) {
            return idx % 2 == 1 ? -value : value
        });
        result += c.join(",");

        for (var i = 0; match = re2.exec(vml); ++i) {
            var c = match[2].split(',');
            c = c.map(function(value, idx) {
                return idx % 2 == 1 ? -value : value
            });
            result += match[1]+c.join(",");
        }
        return result;
    };

    // public interface
    return $.extend(true, Fontomas, {
        lib: {
            Font: Font
        }
    });
})(Fontomas || {});
