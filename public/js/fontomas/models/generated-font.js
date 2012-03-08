var Fontomas = (function (_, Backbone, Fontomas) {
  "use strict";

  Fontomas.app.models.GeneratedFont = Backbone.Model.extend({
    defaults: {glyph_count: 0},

    initialize: function () {
      var i, ch;

      console.log("app.models.GeneratedFont.initialize");
      this.glyphs = new Fontomas.app.collections.Glyph;

      // add space glyph
      this.glyphs.add({
        num:    20,
        top:    "space",
        bottom: this.toUnicode(" "),
        char:   this.toCharRef(" ")
      });

      // add basic latin glyphs
      for (i = 33; i <= 126; i++) {
        ch = String.fromCharCode(i);
        this.glyphs.add({
          num:    i,
          top:    ch,
          bottom: this.toUnicode(ch),
          char:   this.toCharRef(ch)
        });
      }

    },

    incCounter: function () {
      this.set("glyph_count", this.get("glyph_count") + 1);
    },

    decCounter: function () {
      this.set("glyph_count", this.get("glyph_count") - 1);
      console.assert(this.get("glyph_count") >= 0);
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
