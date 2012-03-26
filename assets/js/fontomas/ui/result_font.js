/*global fontomas, _, Backbone*/

;(function () {
  "use strict";


  var config = fontomas.config;


  fontomas.views.result_font = Backbone.View.extend({
    glyphviews: [],
    events:     {},
    glyph_size: null,


    initialize: function () {
      fontomas.logger.debug("views.result_font.initialize");

      _.bindAll(this);
      this.glyph_size = this.options.glyph_size;

      this.model.glyphs.each(this.onAddGlyph);
      this.model.glyphs.on("add", this.onAddGlyph, this);

      this.model.on("change:glyph_count", this.onChangeGlyphCount, this);
    },


    // a model has been added, so we create a corresponding view for it
    onAddGlyph: function (glyph) {
      fontomas.logger.debug("views.result_font.onAddGlyph");

      var view = new fontomas.views.glyph({
        model:      glyph,
        glyph_size: this.glyph_size
      });

      view.on("remove", this.onRemoveGlyph, this);
      this.glyphviews.push(view);
      this.$el.append(view.el);
    },


    onRemoveGlyph: function (view) {
      fontomas.logger.debug("views.result_font.onRemoveGlyph");
      this.glyphviews = _.without(this.glyphviews, view);
    },


    onChangeGlyphCount: function (model, glyph_count) {
      fontomas.logger.debug("views.result_font.onChangeGlyphCount");

      $('#fm-glyph-count').text(glyph_count);

      if (model.previous("glyph_count") === 0 && glyph_count > 0) {
        this.trigger("someGlyphsSelected");
      } else if (model.previous("glyph_count") > 0 && glyph_count === 0) {
        this.trigger("noGlyphsSelected");
      }
    },


    removeGlyphsByFont: function (font_id) {
      fontomas.logger.debug("views.result_font.removeGlyphsByFont");

      _.each(this.glyphviews, function (view) {
        if (view.model.get("source_glyph").font_id === font_id) {
          view.model.destroy();
        }
      });
    },


    render: function () {
      fontomas.logger.debug("views.result_font.render");

      _.each(this.glyphviews, function (view) {
        this.$el.append(view.el);
      }, this);

      return this;
    },


    changeGlyphSize: function (new_size) {
      fontomas.logger.debug("views.result_font.changeGlyphSize");

      this.$el
        .removeClass("glyph-size-" + this.glyph_size)
        .addClass("glyph-size-" + new_size);

      this.glyph_size = new_size;

      // FIXME: will be removed soon
      _.each(this.glyphviews, function (view) {
        view.changeGlyphSize(new_size);
      });
    },


    scalePath: function (path, scale) {
      return path.replace(/(-?\d*\.?\d*(?:e[\-+]?\d+)?)/ig, function (num) {
        num = (parseFloat(num) * scale).toPrecision(config.scale_precision);
        // extra parseFloat to strip trailing zeros
        num = parseFloat(num);
        return isNaN(num) ? "" : num;
      });
    }
  });

}());
