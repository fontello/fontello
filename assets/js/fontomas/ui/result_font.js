/*global fontomas, _, Backbone*/

;(function () {
  "use strict";


  fontomas.ui.result_font = Backbone.View.extend({
    glyphviews: [],
    events:     {},
    glyph_size: null,


    initialize: function () {
      _.bindAll(this);
      this.glyph_size = this.options.glyph_size;

      this.model.glyphs.each(this.onAddGlyph);
      this.model.glyphs.on("add", this.onAddGlyph, this);

      this.model.on("change:glyph_count", this.onChangeGlyphCount, this);
    },


    // a model has been added, so we create a corresponding view for it
    onAddGlyph: function (glyph) {
      var view = new fontomas.ui.glyph({
        model:      glyph,
        glyph_size: this.glyph_size
      });

      view.on("remove", this.onRemoveGlyph, this);
      this.glyphviews.push(view);
      this.$el.append(view.el);
    },


    onRemoveGlyph: function (view) {
      this.glyphviews = _.without(this.glyphviews, view);
    },


    onChangeGlyphCount: function (model, glyph_count) {
      $('#fm-glyph-count').text(glyph_count);

      if (model.previous("glyph_count") === 0 && glyph_count > 0) {
        this.trigger("someGlyphsSelected");
      } else if (model.previous("glyph_count") > 0 && glyph_count === 0) {
        this.trigger("noGlyphsSelected");
      }
    },


    removeGlyphsByFont: function (font_id) {
      _.each(this.glyphviews, function (view) {
        if (view.model.get("source_glyph").font_id === font_id) {
          view.model.destroy();
        }
      });
    },


    render: function () {
      _.each(this.glyphviews, function (view) {
        this.$el.append(view.el);
      }, this);

      return this;
    },


    changeGlyphSize: function (new_size) {
      this.$el
        .removeClass("glyph-size-" + this.glyph_size)
        .addClass("glyph-size-" + new_size);

      this.glyph_size = new_size;
    }
  });

}());
