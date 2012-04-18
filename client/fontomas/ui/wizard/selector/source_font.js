/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

module.exports = Backbone.View.extend({
  tagName:    "li",
  glyph_size: null,
  events:     {"click .glyph": "onClickGlyph"},


  initialize: function () {
    _.bindAll(this);
    this.glyph_size = this.options.glyph_size;

    this.$el.attr("id", "fm-font-" + this.model.id);

    this.model.on("change",   this.render,  this);
    this.model.on("destroy",  this.remove,  this);
  },


  render: function () {
    var $info;

    this.$el.html(nodeca.client.fontomas.render('font-item', {
      id:         this.model.id,
      fontname:   this.model.get("font").fullname,
      css_class:  "font-embedded-" + this.model.get("embedded_id")
    }));

    // render info html
    $info = $(nodeca.client.fontomas.render('selector:font-info', this.model.get('font')));

    // assign modal window popup handler
    this.$('.font-info').click(function () {
      $info.appendTo(window.document.body).modal();
      // prevent default browser behavior - jump to the top
      return false;
    });

    this.$(".fm-glyph-group")
      .addClass("glyph-size-" + this.glyph_size);

    _.each(this.model.get("glyphs"), function (item, glyph_id) {
      var glyph = nodeca.client.fontomas.render('glyph-item', {
        glyph_id: glyph_id,
        unicode:  nodeca.client.fontomas.util.fixedFromCharCode(item.code)
      });

      this.$(".fm-glyph-group").append(glyph);
    }, this);

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
    this.trigger("remove", this.model);
  },


  onClickGlyph: function (event) {
    var $target   = $(event.currentTarget),
        glyph_id  = parseInt($target.attr("data-glyph-id"), 10),
        data      = this.model.getGlyph(glyph_id),
        selected;

    data = _.extend(data, {
      font_id:      this.model.id,
      glyph_id:     glyph_id,
      embedded_id:  this.model.get("embedded_id")
    });

    selected = $target.hasClass("selected");
    $target.toggleClass("selected", !selected);

    this.trigger("toggleGlyph", data);
  },


  activateGlyph: function (id) {
    this.$('.glyph[data-glyph-id=' + id + ']').addClass('selected');
  },


  deactivateGlyph: function (id) {
    this.$('.glyph[data-glyph-id=' + id + ']').deactivateClass('selected');
  }
});
