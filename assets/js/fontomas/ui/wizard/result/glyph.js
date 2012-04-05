/*global fontomas, _, Backbone*/

;(function () {
  "use strict";


  fontomas.ui.wizard.result.glyph = Backbone.View.extend({
    tagName:    "div",
    className:  "fm-result-glyph",

    events:     {
      "click .top":     "editTop",
      "click .bottom":  "editBottom"
    },


    initialize: function () {
      _.bindAll(this);

      this.model.on("change",  this.render, this);
      this.model.on("destroy", this.remove, this);

      this.render();
    },


    editTop: function () {
      var self  = this,
          val   = fontomas.util.fixedFromCharCode(
                  self.model.get("unicode_code"));

      this.$el.addClass("editing-top");
      this.$(".top.edit input")
        .focus()
        .off(".fm-editing")
        .val(val)
        .on("blur.fm-editing", function (event) {
          var code  = fontomas.util.fixedCharCodeAt(
                      self.$(".top.edit input").val());

          self.model.set("unicode_code", code);
          self.$el.removeClass("editing-top");
        })
        .on("keyup.fm-editing", function (event) {
          if (event.keyCode === 13) {
            $(event.target).blur();
          } else if (event.keyCode === 27) {
            $(event.target).val(val);
            self.$el.removeClass("editing-top");
          }
        });
    },


    editBottom: function () {
      var self  = this,
          val   = this.model.get("unicode_code").toString(16).toUpperCase();

      this.$el.addClass("editing-bottom");
      this.$(".bottom.edit input")
        .focus()
        .off(".fm-editing")
        .val(val)
        .on("blur.fm-editing", function (event) {
          var code = parseInt(self.$(".bottom.edit input").val(), 16);
          self.model.set("unicode_code", code);
          self.$el.removeClass("editing-bottom");
        })
        .on("keyup.fm-editing", function (event) {
          if (event.keyCode === 13) {
            $(event.target).blur();
          } else if (event.keyCode === 27) {
            $(event.target).val(val);
            self.$el.removeClass("editing-bottom");
          }
        });
    },


    render: function () {
      var matched,
          char  = fontomas.util.fixedFromCharCode(
                  this.model.get("unicode_code")),
          source_glyph = this.model.get("source_glyph"),
          html = fontomas.render('resultfont-glyph-item', {
            top:  this.model.get("unicode_code") === 32 ? "space" : char,
            char: fontomas.util.fixedFromCharCode(source_glyph.unicode_code),
            bottom:     this.toUnicode(this.model.get("unicode_code")),
            css_class:  "fm-embedded-" + source_glyph.embedded_id
          });

      this.$el.html(html);

      matched = this.model.get("unicode_code") === source_glyph.unicode_code;
      this.$el.toggleClass("fm-mapping-matched", matched);

      return this;
    },


    // return char in CharRef notation
    toCharRef: function (char) {
      return "&#x" + char.charCodeAt(0).toString(16) + ";";
    },


    // return unicode code point in U+ notation
    toUnicode: function (code) {
      var c = code.toString(16).toUpperCase();
      return "U+" + "0000".substr(0, Math.max(4 - c.length, 0)) + c;
    },


    remove: function () {
      this.$el.remove();
      this.trigger("remove", this);
    }
  });

}());
