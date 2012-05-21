/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


module.exports = Backbone.View.extend({
  el:         '#selector',
  fontViews:  [],


  initialize: function (attributes) {
    this.changeGlyphSize(nodeca.config.fontomas.glyph_size.val);
  },


  changeGlyphSize: function (size) {
    this.$el.css('font-size', size);
  },


  addFont: function (font) {
    var view = new nodeca.client.fontomas.ui.panes.selector_font({model: font});

    view.on("toggleGlyph",        this.onToggleGlyph, this);
    view.on("remove",             this.removeFont,    this);

    this.fontViews.push(view);
    $("#selector-fonts").append(view.render().el);
  },


  removeFont: function (font) {
    this.fontViews = _.without(this.fontViews, function (view) {
      return view.model === font;
    });

    this.trigger('remove:font', font);
  },


  highlightGlyph: function (data) {
    var font_view = _.find(this.fontViews, function (view) {
      return view.model.get('id') === data.font_id;
    });

    if (font_view) {
      font_view.highlightGlyph(data.glyph_id);
    }
  },


  onToggleGlyph: function (data) {
    this.trigger('click:glyph', data);
  }
});
