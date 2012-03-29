/*global fontomas, _, Backbone*/

;(function () {
  "use strict";


  var max_glyphs, // undefined === no limit
      parsers = {}, // SVG, CufonJS parsers
      vml_to_svg = { // map of vml to svg instruction conversion
        l: "L",
        c: "C",
        x: "z",
        t: "m",
        r: "l",
        v: "c"
      };


  if (fontomas.debug.is_on && fontomas.debug.maxglyphs) {
    max_glyphs = fontomas.debug.maxglyphs;
  }


  function vmlToSvgPath(vml) {
    var path;

    if (!vml) {
      return "";
    }

    path = vml.replace(/[mlcxtrv]/g, function (c) {
      return vml_to_svg[c] || "M";
    });

    return "M" + path + "z";
  }


  function vmlNegateY(vml) {
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
  }


  // convert svg font's unicode attribute to a unicode code point
  // in: s="!"      out=33
  // in: s="&#33;"  out=33
  // in: s="&#x21;" out=33
  function svgUnicodeAttr2codePoint(s) {
    var result;

    if (s.substr(0,2) === "&#" && s.indexOf(";") !== -1) {
      result = s.substr(2, s.indexOf(";") - 2);
      if (result.charAt(0) === "x") {
        result = parseInt("0" + result, 16);
      } else {
        result = parseInt(result, 10);
      }
    } else {
      result = fontomas.util.fixedCharCodeAt(s);
    }
    return result;
  }


  parsers.svg = function (svg) {
    var font = {}, xml;

    fontomas.logger.debug("Font.initSvg");

    try {
      xml = $.parseXML(svg);
    } catch (e) {
      fontomas.logger.error("Font.initSvg: invalid xml");
      return null;
    }

    font.horiz_adv_x  = parseInt($("font:first", xml).attr("horiz-adv-x"), 10) || 1000;
    font.ascent       = parseInt($("font-face:first", xml).attr("ascent"), 10) || 750;
    font.descent      = parseInt($("font-face:first", xml).attr("descent"), 10) || -250;
    font.units_per_em = parseInt($("font-face:first", xml).attr("units-per-em"), 10) || 1000;
    font.id           = $("font:first", xml).attr("id") || "unknown";
    font.glyphs       = [];

    $("glyph", xml).slice(0, max_glyphs).each(function (i) {
      var glyph = fontomas.util.getAllAttrs(this);

      if (glyph["horiz-adv-x"]) {
        glyph.horiz_adv_x = parseInt(glyph["horiz-adv-x"], 10);
        delete glyph["horiz-adv-x"];
      }

      if (glyph["unicode"]) {
        glyph.unicode_code = svgUnicodeAttr2codePoint(glyph["unicode"]);
        delete glyph["unicode"];
      }

      font.glyphs[i] = glyph;
    });

    return font;
  };


  parsers.js = function (js) {
    var font = {}, json_string, json, cur_glyph = 0;

    fontomas.logger.debug("initCufonJs");

    try {
      // strip function call
      json_string = fontomas.util.trimBoth(js, ".registerFont(", ")");
      json = $.parseJSON(json_string);
    } catch (e) {
      fontomas.logger.error("Font.initCufonJs: invalid json");
      return null;
    }

    font.horiz_adv_x  = json.w || 1000;
    font.ascent       = json.face.ascent || 750;
    font.descent      = json.face.descent || -250;
    font.units_per_em = json.face["units-per-em"] || 1000;
    font.id           = json.face["font-family"] || "unknown";
    font.glyphs       = [];

    _.each(json.glyphs, function (glyph, i) {
      if (max_glyphs && (cur_glyph >= max_glyphs)) {
        return;
      }

      glyph.unicode_code = fontomas.util.fixedCharCodeAt(i);

      if (glyph.w) {
        glyph.horiz_adv_x = glyph.w;
        delete glyph.w;
      }

      if (glyph.d) {
        // fix y coord and convert vml path to svg path
        glyph.d = vmlToSvgPath(vmlNegateY(glyph.d));
      }

      font.glyphs[cur_glyph] = glyph;
      cur_glyph++;
    });

    return font;
  };


  fontomas.models.source_font = Backbone.Model.extend({
    defaults: function () {
      return {
        fontname:     "unknown",
        glyphs:       [],
        is_embedded:  false
      };
    },


    getGlyph: function (glyph_id) {
      return this.get("glyphs")[glyph_id];
    },


    // FIXME: the model isn't sync()ed to server yet
    sync: function () {
      fontomas.logger.debug("models.source_font.sync()");
    }
  }, {
    supported_types: _.keys(parsers),
    parse: function (type, data) {
      var func = parsers[type];
      return func ? func(data) : null;
    }
  });

}());
