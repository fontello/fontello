var Fontomas = (function (Fontomas) {
  "use strict";

  var app = Fontomas.app,
    cfg = Fontomas.cfg,
    Backbone = window.Backbone,
    _ = window._;

  app.models.GeneratedFont = Backbone.Model.extend({
    defaults: {
      charset: "basic_latin",
      glyph_count: 0
    },

    initialize: function () {
      console.log("app.models.GeneratedFont.initialize");
      this.glyphs = new app.collections.Glyph;
      var i, len, char;

      for (i=0, len=cfg.basic_latin.str.length; i<len; i++) {
        char = cfg.basic_latin.str[i];
        this.glyphs.add({
          num: i,
          char: this.toCharRef(char),
          top: (char !== " " ? char : "space"),
          bottom: this.toUnicode(char)
        });
      }
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
      var self = this;
      switch (charset) {
      case "basic_latin":
        _.each(this.glyphs.models, function (glyph, i) {
          var char = cfg.basic_latin.str[i],
            values = {
              char: self.toCharRef(char),
              top: (char !== " " ? char : "space"),
              bottom: self.toUnicode(char)
            };
          glyph.set(values);
        });
        this.set("charset", charset);
        break;

      case "unicode_private":
        _.each(this.glyphs.models, function (glyph, i) {
          var code = (cfg.unicode_private.begin+i).toString(16)
            .toUpperCase(),
            values = {
              char: "&#x" + code + ";",
              top: "&#x" + code + ";",
              bottom: "U+" + code
            };
          glyph.set(values);
        });
        this.set("charset", charset);
        break;

      default:
        console.log("app.models.GeneratedFont.setCharset: bad charset");
        break;
      }
    },

    // return char in CharRef notation
    toCharRef: function (char) {
      return "&#x" + char.charCodeAt(0).toString(16) + ";";
    },

    // return char in U+ notation
    toUnicode: function (char) {
      var c = char.charCodeAt(0).toString(16).toUpperCase();
      if (c.length < 4) {
        c = "0000".substr(0, 4 - c.length) + c;
      }
      return "U+" + c;
    },

    // FIXME: the model isn't sync()ed to server yet
    sync: function () {
      console.log("app.models.GeneratedFont.sync()");
    }
  });

  return Fontomas;
}(Fontomas || {}));
