/*global Fontomas, _, Backbone*/

;(function () {
  "use strict";


  Fontomas.views.glyph = Backbone.View.extend({
    tagName:    "div",
    className:  "fm-result-glyph",
    events:     {},
    glyph_size: null, // FIXME: will be removed soon

    initialize: function () {
      //Fontomas.logger.debug("views.glyph.initialize");

      _.bindAll(this);
      this.glyph_size = this.options.glyph_size;  // FIXME: will be removed soon

      this.model.on("change",   this.render, this);
      this.model.on("destroy",  this.remove, this);

      this.render();
    },


    render: function () {
      Fontomas.logger.debug("views.glyph.render el=", this.el);

      // FIXME
      if (this.model.get("source_glyph").embedded_id === undefined) {
        return this.render_old();
      }

      var char = String.fromCharCode(this.model.get("unicode_code")),
          source_glyph = this.model.get("source_glyph"),
          html = Fontomas.render('resultfont-glyph-item', {
            top:        this.model.get("unicode_code") === 32 ? "space" : char,
            char:       source_glyph.unicode,
            bottom:     this.toUnicode(char),
            css_class:  "fm-embedded-" + source_glyph.embedded_id
          });

      this.$el.html(html);

      return this;
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


    remove: function () {
      Fontomas.logger.debug("views.glyph.remove");
      this.$el.remove();
      this.trigger("remove", this);
    },


    // this is obsolete, will be removed soon
    render_old: function () {
      Fontomas.logger.debug("views.glyph.render_old el=", this.el);

      var char = String.fromCharCode(this.model.get("unicode_code")),
          source_glyph = this.model.get("source_glyph"),
          html = Fontomas.render('resultfont-glyph-item-old', {
            top:        this.model.get("unicode_code") === 32 ? "space" : char,
            bottom:     this.toUnicode(char)
          });

      this.$el.html(html);
      this.$(".center").html(source_glyph.svg);
      this.changeGlyphSize(this.glyph_size);

      return this;
    },


    // this is obsolete, will be removed soon
    changeGlyphSize: function (size) {
      Fontomas.logger.debug("views.glyph.changeGlyphSize");

      if (this.model.get("source_glyph").embedded_id !== undefined) {
        return;
      }

      this.glyph_size   = size;
      var source_glyph  = this.model.get("source_glyph"),
          size_x        = source_glyph.glyph_sizes[size][0],
          size_y        = source_glyph.glyph_sizes[size][1];

      this.$("svg")
        .css({
          "width":        size_x + "px",
          "height":       size_y + "px",
          "line-height":  size_y + "px"
        });
    }
  });

}());
