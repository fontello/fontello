var Fontomas = (function (_, Fontomas) {
  "use strict";

  var Font,
      max_glyphs, // undefined === no limit
      vml_to_svg = { // map of vml to svg instruction conversion
        l: "L",
        c: "C",
        x: "z",
        t: "m",
        r: "l",
        v: "c"
      };

  if (Fontomas.debug.is_on && Fontomas.debug.maxglyphs) {
    max_glyphs = Fontomas.debug.maxglyphs;
  }


  Font = function (type, data) {
    if (this instanceof Font) {
      $.extend(this, arguments[0]);
      return;
    }

    switch (type) {
      case "svg":     return Font.initSvg(data);
      case "cufonjs": return Font.initCufonJs(data);
      default:        return null;
    }
  };


  Font.initSvg = function (svg) {
    var font = {}, xml;

    console.log("Font.initSvg");

    try {
      xml = $.parseXML(svg);
    } catch (e) {
      console.log("Font.initSvg: invalid xml");
      return null;
    }

    font.horiz_adv_x  = parseInt($("font:first", xml).attr("horiz-adv-x"), 10) || 1000;
    font.ascent       = parseInt($("font-face:first", xml).attr("ascent"), 10) || 750;
    font.descent      = parseInt($("font-face:first", xml).attr("descent"), 10) || -250;
    font.units_per_em = parseInt($("font-face:first", xml).attr("units-per-em"), 10) || 1000;
    font.id           = $("font:first", xml).attr("id") || "unknown";
    font.glyphs       = [];

    $("glyph", xml).slice(0, max_glyphs).each(function (i) {
      var glyph = Fontomas.lib.util.getAllAttrs(this);

      if (glyph["horiz-adv-x"]) {
        glyph.horiz_adv_x = parseInt(glyph["horiz-adv-x"], 10);
        delete glyph["horiz-adv-x"];
      }

      font.glyphs[i + 1] = glyph; // font.glyphs first el idx = 1
    });

    return new Font(font);
  };


  Font.initCufonJs = function (js) {
    var font = {}, json_string, json;

    console.log("initCufonJs");

    try {
      // strip function call
      json_string = Fontomas.lib.util.trimBoth(js, ".registerFont(", ")");
      json = $.parseJSON(json_string);
    } catch (e) {
      console.log("Font.initCufonJs: invalid json");
      return null;
    }

    font.horiz_adv_x  = json.w || 1000;
    font.ascent       = json.face.ascent || 750;
    font.descent      = json.face.descent || -250;
    font.units_per_em = json.face["units-per-em"] || 1000;
    font.id           = json.face["font-family"] || "unknown";

    _.each(json.glyphs.slice(0, max_glyphs), function (glyph, i) {
      glyph.unicode = i;

      if (glyph.w) {
        glyph.horiz_adv_x = glyph.w;
        delete glyph.w;
      }

      if (glyph.d) {
        // fix y coord and convert vml path to svg path
        glyph.d = Font.vmlToSvgPath(Font.vmlNegateY(glyph.d));
      }

      font.glyphs[i + 1] = glyph; // font.glyphs first el idx = 1
    });

    return new Font(font);
  };


  Font.vmlToSvgPath = function (vml) {
    var path;

    if (!vml) {
      return "";
    }

    path = vml.replace(/[mlcxtrv]/g, function (c) {
      return vml_to_svg[c] || "M";
    });

    return "M" + path + "z";
  };


  Font.vmlNegateY = function (vml) {
    if (!vml) {
      return vml;
    }

    var result = "", match, re = /([mrvxe])([^a-z]*)/g;

    function negateEverySecond(value, idx) {
      return idx % 2 === 1 ? -value : value;
    }

    match = /^([^a-z]*)/.exec(vml);
    result += match[1].split(',').map(negateEverySecond).join(",");

    /*jshint boss:true*/
    while (match = re.exec(vml)) {
      result += match[1];
      result += match[2].split(',').map(negateEverySecond).join(",");
    }

    return result;
  };

  // public interface
  return $.extend(true, Fontomas, {lib: {Font: Font}});
}(window._, Fontomas || {}));
