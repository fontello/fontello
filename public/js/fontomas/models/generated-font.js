var Fontomas = (function (_, Backbone, Fontomas) {
  "use strict";

  var config = Fontomas.cfg;

  Fontomas.app.models.GeneratedFont = Backbone.Model.extend({
    defaults: {
      charset:      "basic_latin",
      glyph_count:  0
    },

    initialize: function () {
      console.log("app.models.GeneratedFont.initialize");
      this.glyphs = new Fontomas.app.collections.Glyph;

      _.each(config.basic_latin.str.split(''), function (ch, i) {
        this.glyphs.add({
          num: i,
          char: this.toCharRef(ch),
          top: (ch !== " " ? ch : "space"),
          bottom: this.toUnicode(ch)
        });
      }, this);

      this.setCharset(this.get("charset"));
    },

    incCounter: function () {
      this.set("glyph_count", this.get("glyph_count") + 1);
    },

    decCounter: function () {
      this.set("glyph_count", this.get("glyph_count") - 1);
      console.assert(this.get("glyph_count") >= 0);
    },

    setCharset: function (charset) {
      if ("basic_latin" === charset) {
        _.each(this.glyphs.models, function (glyph, i) {
          var char = config.basic_latin.str[i];

          glyph.set({
            char: this.toCharRef(char),
            top: (char !== " " ? char : "space"),
            bottom: this.toUnicode(char)
          });
        }, this);

        this.set("charset", charset);
      } else if ("unicode_private" === charset) {
        _.each(this.glyphs.models, function (glyph, i) {
          var code = (config.unicode_private.begin + i).toString(16).toUpperCase();

          glyph.set({
            char:   "&#x" + code + ";",
            top:    "&#x" + code + ";",
            bottom: "U+" + code
          });
        }, this);

        this.set("charset", charset);
      } else {
        console.log("app.models.GeneratedFont.setCharset: bad charset");
      }
    },

    // return char in CharRef notation
    toCharRef: function (char) {
      return "&#x" + char.charCodeAt(0).toString(16) + ";";
    },

    // return char in U+ notation
    toUnicode: function (char) {
      var c = char.charCodeAt(0).toString(16).toUpperCase();
      return "U+" + "0000".substr(0, 4 - c.length % 4) + c;
    },

    // FIXME: the model isn't sync()ed to server yet
    sync: function () {
      console.log("app.models.GeneratedFont.sync()");
    }
  });

  return Fontomas;
}(window._, window.Backbone, Fontomas || {}));
