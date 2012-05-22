/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

module.exports = Backbone.View.extend({
  tagName:    "div",
  className:  "result-glyph",

  events:     {
    "click .top":     "onClickTop",
    "click .bottom":  "onClickBottom"
  },


  initialize: function () {
    _.bindAll(this);

    this.model.on("change",  this.render, this);
    this.model.on("destroy", this.remove, this);

    this.render();
  },


  onClickTop: function (event) {
    var self  = this,
        val   = nodeca.client.fontomas.util.fixedFromCharCode(
                self.model.get("code"));

    this.$el.addClass("editing-top");
    this.$(".top.edit input")
      .focus()
      .off(".fm-editing")
      .val(val)
      .on("blur.fm-editing", function (event) {
        var code  = nodeca.client.fontomas.util.fixedCharCodeAt(
                    self.$(".top.edit input").val());

        self.model.set("code", code);
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


  onClickBottom: function (event) {
    var self  = this,
        val   = this.model.get("code").toString(16).toUpperCase();

    this.$el.addClass("editing-bottom");
    this.$(".bottom.edit input")
      .focus()
      .off(".fm-editing")
      .val(val)
      .on("blur.fm-editing", function (event) {
        var code = parseInt(self.$(".bottom.edit input").val(), 16);
        self.model.set("code", code);
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
        char  = nodeca.client.fontomas.util.fixedFromCharCode(
                this.model.get("code")),
        source_glyph = this.model.get("source_glyph"),
        html = nodeca.client.fontomas.render('resultfont-glyph-item', {
          top:  this.model.get("code") === 32 ? "space" : char,
          char: nodeca.client.fontomas.util.fixedFromCharCode(source_glyph.code),
          bottom:     this.toUnicode(this.model.get("code")),
          css_class:  "font-embedded-" + source_glyph.embedded_id
        });

    this.$el.html(html);

    matched = this.model.get("code") === source_glyph.code;
    this.$el.toggleClass("mapping-matched", matched);

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
