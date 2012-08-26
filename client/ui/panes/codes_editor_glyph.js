/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

module.exports = Backbone.View.extend({
  tagName:    "div",
  className:  "result-glyph",


  initialize: function () {
    this.model.on("change",  this.render, this);
    this.model.on("destroy", this.remove, this);
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
    var model   = this.model,
        source  = model.get('source'),
        font    = model.get('font').getName(),
        uid     = source.uid,
        code    = nodeca.shared.glyphs_map[font][uid],
        char    = nodeca.client.util.fixedFromCharCode(model.get("code"));

    this.$el.html(nodeca.client.render('code-editor.glyph', {
      top:        model.get("code") === 32 ? "space" : char,
      chr:        nodeca.client.util.fixedFromCharCode(code),
      bottom:     this.toUnicode(model.get("code")),
      css_class:  "font-embedded-" + model.get('font').get('id')
    }));

    this.$el.find('.top .editable').inplaceEditor({
      type:       'text',
      allowEmpty: false,
      filter:     function (val) {
        var prev = this.prev || this.value;
        this.prev = String(val).replace(prev, '');
        return this.prev;
      }
    }).on('change', function (event, val) {
      model.set("code", nodeca.client.util.fixedCharCodeAt(val));
    });

    this.$el.find('.bottom .editable').inplaceEditor({
      type:       'text',
      allowEmpty: false,
      filter:     function (val) {
        return String(val).replace(/[^0-9a-fA-F]/, '').substr(0, 6);
      }
    }).on('change', function (event, val) {
        model.set("code", parseInt(val, 16));
    });

    this.$el.toggleClass("mapping-matched", model.get("code") === source.code);

    return this;
  },


  // return char in CharRef notation
  toCharRef: function (char) {
    return "&#x" + char.charCodeAt(0).toString(16) + ";";
  },


  // return unicode code point in U+ notation
  toUnicode: function (code) {
    var c = code.toString(16).toUpperCase();
    return "0000".substr(0, Math.max(4 - c.length, 0)) + c;
  }
});
