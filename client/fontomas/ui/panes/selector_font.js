/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

module.exports = Backbone.View.extend({
  tagName:    "li",
  events:     {"click .glyph": "onClickGlyph"},


  initialize: function () {
    var self = this;

    this.$el.attr("id", "font-id-" + this.model.id);

    this.model.on("change",   this.render,  this);
    this.model.on("destroy",  this.remove,  this);

    // activate selectable plugin
    this.$el.selectable({
      filter: 'li.glyph:visible',
      distance: 5,
      stop: function () {
        var $els = self.$('.glyph.ui-selected');

        // prevent from double-triggering event,
        // otherwise click event will be fired as well
        if (1 === $els.length) {
          return;
        }

        $els.each(function () {
          self.onClickGlyph({currentTarget: this});
        });
      }
    });
  },

  render: function () {
    var $info;

    this.$el.html(nodeca.client.fontomas.render('font-item', {
      id:         this.model.id,
      fontname:   this.model.get("font").fullname,
      css_class:  "font-embedded-" + this.model.get("embedded_id")
    }));

    // render info html
    $info = $(nodeca.client.fontomas.render('selector:font-info', this.model.toJSON()));

    // assign modal window popup handler
    this.$('.font-info').click(function () {
      $info.appendTo(window.document.body).modal();
      // prevent default browser behavior - jump to the top
      return false;
    });

    // process each glyph
    _.each(this.model.get("glyphs"), function (item, glyph_id) {
      var glyph = nodeca.client.fontomas.render('glyph-item', {
        glyph_id: glyph_id,
        tags:     (item.search || []).join(' '),
        unicode:  nodeca.client.fontomas.util.fixedFromCharCode(item.code)
      });

      this.$(".font-glyphs").append(glyph);
    }, this);

    return this;
  },


  remove: function () {
    this.$el.remove();
    this.trigger("remove", this.model);
  },



  highlightGlyph: function (glyphId) {
    this.$('[data-glyph-id="' + glyphId + '"]').addClass('selected');
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
  }
});
