/*global fontomas, Backbone*/

;(function () {
  "use strict";


  fontomas.models.glyph = Backbone.Model.extend({
    // SEE: http://www.unicode.org/versions/Unicode6.0.0/ch02.pdf
    //
    // In the Unicode Standard, the codespace consists of the integers
    // from 0 to 10FFFF16, comprising 1,114,112 code points available for
    // assigning the repertoire of abstract characters.
    // ...
    // Noncharacters. Sixty-six code points are not used to encode characters.
    // Noncharacters consist of U+FDD0..U+FDEF and any code point ending in the
    // value FFFE16 or FFFF16- that is, U+FFFE, U+FFFF, U+1FFFE, U+1FFFF, ...
    // U+10FFFE, U+10FFFF.
    validate: function (attrs) {
      var c       = attrs.unicode_code,
          ok_val  = (0 <= c && c <= 0x10ffff),
          nonchar = (0xfdd0 <= c && c <= 0xfdef) ||
                    (c % 0x10000 === 0xfffe) ||
                    (c % 0x10000 === 0xffff);

      if (!ok_val || nonchar) {
        fontomas.logger.debug("models.glyph.validate: bad char code:", c);
        return "Bad char code: " + c;
      }

      return null;
    },


    // Stub to prevent Backbone from reading or saving the model to the server.
    // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
    // if model doesn't have own `sync()` method.
    sync: function () {}
  });

}());
