/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

module.exports = Backbone.View.extend({
  tagName:    "div",
  className:  "result-glyph",


  initialize: function () {
    this.model.on("change",  this.render, this);
    this.model.on("destroy", this.remove, this);
  },


  render: function () {
    var model   = this.model,
        source  = model.get('source'),
        font    = model.get('font').getName(),
        uid     = source.uid,
        code    = nodeca.shared.glyphs_map[font][uid],
        char    = nodeca.client.util.fixedFromCharCode(model.get("code"));

    this.$el.html(nodeca.client.render('ui.panes.codes_editor.glyph', {
      top:        model.get("code") === 32 ? "space" : char,
      chr:        nodeca.client.util.fixedFromCharCode(code),
      bottom:     this.toUnicode(model.get("code")),
      css_class:  "font-embedded-" + model.get('font').get('id')
    }));

    this.$el.find('.char-editable').inplaceEditor({
      validateChar: function (char) {
        this.setValue(char);
        return false;
      },
      filterValue:  function (val) {
        var code = nodeca.client.util.fixedCharCodeAt(val);
        return nodeca.client.util.fixedFromCharCode(code);
      }
    }).on('change', function (event, val) {
      model.set("code", nodeca.client.util.fixedCharCodeAt(val));
    });

    this.$el.find('.code-editable').inplaceEditor({
      noPaste:      true,
      validateChar: function (char) {
        return /[0-9a-fA-F]/.test(char) && 6 > this.getValue().length;
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
