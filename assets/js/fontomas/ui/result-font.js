/*global Fontomas, _, Backbone*/

;(function () {
  "use strict";


  var config = Fontomas.config;


  Fontomas.views.ResultFont = Backbone.View.extend({
    glyphviews: [],
    events:     {},
    iconsize:   null,


    initialize: function () {
      Fontomas.logger.debug("views.ResultFont.initialize");

      _.bindAll(this);
      this.iconsize = this.options.iconsize;

      this.model.glyphs.each(this.onAddGlyph);
      this.model.glyphs.on("add", this.onAddGlyph, this);

      this.model.on("change:glyph_count", this.onChangeGlyphCount, this);
    },


    // a model has been added, so we create a corresponding view for it
    onAddGlyph: function (glyph) {
      Fontomas.logger.debug("views.ResultFont.onAddGlyph");

      var view = new Fontomas.views.Glyph({
        model: glyph,
        iconsize: this.iconsize
      });
      view.on("remove", this.onRemoveGlyph, this);
      this.glyphviews.push(view);
      this.$el.append(view.el);
    },


    onRemoveGlyph: function (view) {
      Fontomas.logger.debug("views.ResultFont.onRemoveGlyph");
      this.glyphviews = _.without(this.glyphviews, view);
    },


    onChangeGlyphCount: function (model, glyph_count) {
      Fontomas.logger.debug("views.ResultFont.onChangeGlyphCount");
      $('#fm-glyph-count').text(glyph_count);

      if (model.previous("glyph_count") === 0 && glyph_count > 0) {
        this.trigger("someGlyphsSelected");
      } else if (model.previous("glyph_count") > 0 && glyph_count === 0) {
        this.trigger("noGlyphsSelected");
      }
    },


    render: function () {
      var self = this;

      Fontomas.logger.debug("views.ResultFont.render");

      _.each(this.glyphviews, function (glyph) {
        self.$el.append(glyph.el);
      });

      return this;
    },


    changeIconSize: function (size) {
      Fontomas.logger.debug("views.ResultFont.changeIconSize");

      this.iconsize = size;

      this.$el
        .removeClass(config.icon_size_classes)
        .addClass(config.icon_size_prefix + size);

      _.each(this.glyphviews, function (view) {
        view.changeIconSize(size);
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
