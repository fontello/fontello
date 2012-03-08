var Fontomas = (function (Fontomas) {
  "use strict";

  var app = Fontomas.app,
    cfg = Fontomas.cfg,
    util = Fontomas.lib.util,
    Backbone = window.Backbone,
    _ = window._;

  app.views.GeneratedFont = Backbone.View.extend({
    glyphviews: [],

    events: {
    },

    initialize: function () {
      console.log("app.views.GeneratedFont.initialize");
      _.bindAll(this);
      this.topview = this.options.topview;

      this.model.glyphs.each(this.addGlyph);
      this.model.glyphs.bind("add", this.addGlyph, this);

      this.model.bind("change:glyph_count",
        this.updateGlyphCount, this);
      this.model.bind("change", this.onChange, this);
    },

    render: function () {
      console.log("app.views.GeneratedFont.render");
      _(this.glyphviews).each(function (glyph) {
        $(cfg.id.generated_font).append(glyph.render().el);
      });

      // reset rearrange zone
      $(cfg.id.generated_font)
        .find(".fm-glyph-id").attr({value: "", checked: false});

      return this;
    },

    addGlyph: function (glyph) {
      //console.log("app.views.GeneratedFont.addGlyph");
      this.glyphviews.push(new app.views.Glyph({
        model: glyph,
        topview: this.topview
      }));
    },

    updateGlyphCount: function () {
      console.log("app.views.GeneratedFont.updateGlyphCount");
      $(cfg.id.glyph_count).text(this.model.get("glyph_count"));
    },

    onChange: function () {
      console.log("app.views.GeneratedFont.onChange");
      if (cfg.live_update) {
        this.updateFont();
      }
    },

    scalePath: function (path, scale) {
      path = path.replace(/(-?\d*\.?\d*(?:e[\-+]?\d+)?)/ig,
        function (num) {
        num = (parseFloat(num) * scale)
          .toPrecision(cfg.scale_precision);
        // extra parseFloat to strip trailing zeros
        num = parseFloat(num);
        return isNaN(num) ? "" : num;
      });
      return path;
    },

    // update font's textarea
    updateFont: function () {
      var self = this,
        glyphs;
      if (!app.main.xml_template) {
        return;
      }

      glyphs = [];
      $(cfg.id.generated_font)
        .find("input:checkbox:checked")
        .each(function () {
          var $this = $(this),
            glyph_id = $this.val(),
            unicode = $this.siblings("input.fm-unicode").val(),

            font = app.main.fonts.getFont(glyph_id),
            glyph = app.main.fonts.getGlyph(glyph_id),
            scale,
            g;

          if (!font || !glyph) {
            console.log("can't getFont/getGlyph id=", glyph_id);
            return;
          }

          if (font.units_per_em !== cfg.output.units_per_em) {
            scale = cfg.output.units_per_em / font.units_per_em;
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

          glyphs.push(util.outerHtml(g));
        });
      $("glyph", app.main.xml_template).remove();
      $("font", app.main.xml_template).append($(glyphs.join("\n")));
      $(cfg.id.font).text(util.xmlToString(app.main.xml_template));
    }
  });

  return Fontomas;
}(Fontomas || {}));
