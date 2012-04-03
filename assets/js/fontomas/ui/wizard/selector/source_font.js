/*global fontomas, _, Backbone, Raphael*/

;(function () {
  "use strict";


  fontomas.ui.wizard.selector.source_font = Backbone.View.extend({
    tagName:    "li",

    glyph_size: null,

    events: {
      "click .fm-font-close": "close",
      "click .fm-glyph-id":   "toggleGlyph"
    },


    initialize: function () {
      _.bindAll(this);
      this.glyph_size = this.options.glyph_size;

      this.$el.attr("id", "fm-font-" + this.model.id);
      this.model.on("change",   this.render,  this);
      this.model.on("destroy",  this.remove,  this);
    },


    render: function () {
      this.$el.html(fontomas.render('font-item', {
        id:         this.model.id,
        fontname:   this.model.get("fontname"),
        css_class:  "fm-embedded-" + this.model.get("embedded_id")
      }));

      this.$(".fm-glyph-group")
        .addClass("glyph-size-" + this.glyph_size);

      _.each(this.model.get("glyphs"), function (item, glyph_id) {
        var glyph = fontomas.render('glyph-item', {
          glyph_id: glyph_id,
          unicode:  fontomas.util.fixedFromCharCode(item.unicode_code)
        });

        this.$(".fm-glyph-group").append(glyph);
      }, this);

      // reset checkboxes as a browser sometimes sets them
      this.$(".fm-glyph-id").attr({checked: false});

      return this;
    },


    changeGlyphSize: function (new_size) {
      this.$(".fm-glyph-group")
        .removeClass("glyph-size-" + this.glyph_size)
        .addClass("glyph-size-" + new_size);

      this.glyph_size = new_size;
    },


    remove: function () {
      this.$el.remove();
      this.trigger("remove", this.model.id);
    },


    close: function (event) {
      event.preventDefault();

      if (this.model.get("is_embedded")) {
        var embedded_id = this.model.get("embedded_id");
        fontomas.embedded_fonts[embedded_id].is_added = false;
        this.trigger("closeEmbeddedFont");
      }

      this.trigger("closeFont", this.model.id);
      this.model.destroy();
    },


    toggleGlyph: function (event) {
      var $target   = $(event.target),
          glyph_id  = parseInt($target.val(), 10),
          data      = this.model.getGlyph(glyph_id);

      data = _.extend(data, {
        font_id:      this.model.id,
        glyph_id:     glyph_id,
        is_embedded:  this.model.get("is_embedded"),
        embedded_id:  this.model.get("embedded_id")
      });

      $target.closest(".fm-glyph")
        .toggleClass("selected", $target.is(":checked"));

      this.trigger("toggleGlyph", data);
    }
  });

}());
