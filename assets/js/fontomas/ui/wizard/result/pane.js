/*global fontomas, _, Backbone*/

;(function () {
  "use strict";


  fontomas.ui.wizard.result.pane = Backbone.View.extend({
    glyphviews: [],
    events:     {},
    glyph_size: _.first(fontomas.config.preview_glyph_sizes),


    initialize: function () {
      _.bindAll(this);

      this.model.glyphs.each(this.onAddGlyph);
      this.model.glyphs.on("add", this.onAddGlyph, this);

      $("#fm-download-font-button").click(this.download);

      this.$el.addClass("glyph-size-" + this.glyph_size);
    },


    download: function (event) {
      fontomas.util.notify_alert("Not yet implemented. Stay tuned.");
      event.preventDefault();
    },


    // a model has been added, so we create a corresponding view for it
    onAddGlyph: function (glyph) {
      var view = new fontomas.ui.wizard.result.glyph({
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
    }
  });

}());
