/*global Fontomas, _, Backbone*/

;(function () {
  "use strict";


  Fontomas.models.GeneratedFont = Backbone.Model.extend({
    defaults: {glyph_count: 0},


    initialize: function () {
      var i, ch;

      Fontomas.logger.debug("models.GeneratedFont.initialize");
      this.glyphs = new Fontomas.models.GlyphsCollection;

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
      Fontomas.logger.assert(this.get("glyph_count") >= 0);
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
      Fontomas.logger.debug("models.GeneratedFont.sync()");
    }
  });

}());
