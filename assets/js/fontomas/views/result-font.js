var Fontomas = (function (_, Backbone, Fontomas) {
  "use strict";

  var config = Fontomas.cfg;

  Fontomas.views.GeneratedFont = Backbone.View.extend({
    glyphviews:  [],
    events:      {},

    initialize: function () {
      Fontomas.logger.debug("views.GeneratedFont.initialize");

      _.bindAll(this);

      this.topview = this.options.topview;

      this.model.glyphs.each(this.addGlyph);
      this.model.glyphs.bind("add", this.addGlyph, this);

      this.model.bind("change:glyph_count", this.updateGlyphCount, this);
      this.model.bind("change",             this.onChange, this);


    },

    render: function () {
      Fontomas.logger.debug("views.GeneratedFont.render");

      _.each(this.glyphviews, function (glyph) {
        $('#fm-generated-font').append(glyph.render().el);
      });

      // reset rearrange zone
      $('#fm-generated-font')
        .find(".fm-glyph-id")
        .attr({value: "", checked: false});

      return this;
    },

    addGlyph: function (glyph) {
      var self = this, view;

      view = new Fontomas.views.Glyph({
        model:    glyph,
        topview:  this.topview
      });

      if (config.live_update) {
        view.on('drop', function () {
          self.updateFont();
        });
      }

      //Fontomas.logger.debug("views.GeneratedFont.addGlyph");
      this.glyphviews.push(view);
    },

    updateGlyphCount: function () {
      Fontomas.logger.debug("views.GeneratedFont.updateGlyphCount");
      $('#fm-glyph-count').text(this.model.get("glyph_count"));
    },

    onChange: function () {
      Fontomas.logger.debug("views.GeneratedFont.onChange");

      if (config.live_update) {
        this.updateFont();
      }
    },

    scalePath: function (path, scale) {
      return path.replace(/(-?\d*\.?\d*(?:e[\-+]?\d+)?)/ig, function (num) {
        num = (parseFloat(num) * scale).toPrecision(config.scale_precision);
        // extra parseFloat to strip trailing zeros
        num = parseFloat(num);
        return isNaN(num) ? "" : num;
      });
    },

    // update font's textarea
    updateFont: function () {
      var self = this, glyphs = [];

      if (!Fontomas.main.xml_template) {
        return;
      }

      $('#fm-generated-font')
        .find("input:checkbox:checked")
        .each(function () {
          var $this    = $(this),
              glyph_id = $this.val(),
              unicode  = $this.siblings("input.fm-unicode").val(),
              font     = Fontomas.main.fonts.getFont(glyph_id),
              glyph    = Fontomas.main.fonts.getGlyph(glyph_id),
              scale,
              g;

          if (!font || !glyph) {
            Fontomas.logger.error("can't getFont/getGlyph id=", glyph_id);
            return;
          }

          if (font.units_per_em !== config.output.units_per_em) {
            scale = config.output.units_per_em / font.units_per_em;

            if (glyph.d) {
              glyph.d = self.scalePath(glyph.d, scale);
            }

            if (glyph.horiz_adv_x) {
              glyph.horiz_adv_x *= scale;
            }
          }

          g = $("<glyph/>");
          g.attr("unicode", unicode);

          if (glyph.horiz_adv_x) {
            g.attr("horiz-adv-x", glyph.horiz_adv_x);
          }

          if (glyph.d) {
            g.attr("d", glyph.d);
          }

          glyphs.push(Fontomas.util.outerHtml(g));
        });

      $("glyph", Fontomas.main.xml_template).remove();
      $("font", Fontomas.main.xml_template).append($(glyphs.join("\n")));
    }
  });

  return Fontomas;
}(window._, window.Backbone, Fontomas || {}));
