/*global fontomas, _, Backbone, Raphael*/

;(function () {
  "use strict";


  var config = fontomas.config;


  // this is obsolete, will be removed soon
  function get_delta(glyph_path, ascent, descent, adv_x) {
    var bbox, delta_ascent, delta_descent, delta_left, delta_right;

    bbox          = glyph_path.getBBox();
    delta_ascent  = Math.max(0, (bbox.y + bbox.height) - ascent);
    delta_descent = Math.max(0, descent - bbox.y);
    delta_left    = Math.max(0, 0 - bbox.x);
    delta_right   = Math.max(0, (bbox.x + bbox.width) - adv_x);

    return {
      x: Math.max(delta_left, delta_right),
      y: Math.max(delta_ascent, delta_descent)
    };
  }


  fontomas.ui.source_font = Backbone.View.extend({
    tagName:    "li",

    glyph_size: null,

    events: {
      "click .fm-font-close": "close",
      "click .fm-glyph-id":   "toggleGlyph"
    },


    initialize: function () {
      _.bindAll(this);
      this.glyph_size = this.options.glyph_size;

      this.$el.attr("id", "fm-font-" + this.model.id);
      this.model.on("change",   this.render,  this);
      this.model.on("destroy",  this.remove,  this);
    },


    render: function () {
      // FIXME
      if (!this.model.get("is_embedded")) {
        return this.render_old();
      }

      this.$el.html(fontomas.render('font-item', {
        id:         this.model.id,
        fontname:   this.model.get("fontname"),
        css_class:  "fm-embedded-" + this.model.get("embedded_id")
      }));

      this.$(".fm-glyph-group")
        .addClass("glyph-size-" + this.glyph_size);

      _.each(this.model.get("glyphs"), function (item, glyph_id) {
        var glyph = fontomas.render('glyph-item', {
          glyph_id: glyph_id,
          unicode:  fontomas.util.fixedFromCharCode(item.unicode_code)
        });

        this.$(".fm-glyph-group").append(glyph);
      }, this);

      // reset checkboxes as a browser sometimes sets them
      this.$(".fm-glyph-id").attr({checked: false});

      return this;
    },


    // this is obsolete, will be removed soon
    render_old: function () {
      var ascent       = this.model.get("ascent"),
          descent      = this.model.get("descent"),
          units_per_em = this.model.get("units_per_em"),
          size         = this.glyph_size,
          font_size_y  = Math.round(size * (ascent - descent) / units_per_em);

      this.$el.html(fontomas.render('font-item', {
        id:        this.model.id,
        fontname:  this.model.get("fontname")
      }));

      this.$(".fm-glyph-group").addClass("glyph-size-" + size);

      _.each(this.model.get("glyphs"), function (item, glyph_id) {
        var horiz_adv_x = item.horiz_adv_x || this.model.get("horiz_adv_x"),
            size_x      = Math.round(size * horiz_adv_x / units_per_em),
            size_y      = font_size_y,
            $glyph      = $(fontomas.render('glyph-item-old', {
              glyph_id: glyph_id
            })),
            path        = item.d,
            r,
            g,
            vb,
            delta,
            flip_y_matrix,
            glyph_sizes;

        this.$(".fm-glyph-group").append($glyph);

        // add svg
        r = new Raphael($glyph[0], size_x, size_y);
        g = r.path(path).attr({
          "fill":         "#000",
          "stroke":       "#000",
          "stroke-width": 0
        });

        // calc delta_x, delta_y
        delta = get_delta(g, ascent, descent, horiz_adv_x);

        // SVG's ViewBox
        vb = {
          x: 0 - delta.x,
          y: descent - delta.y,
          w: horiz_adv_x + 2 * delta.x,
          h: (ascent - descent) + 2 * delta.y
        };

        // calc new size_y, size_x if glyph goes out of its default
        // box
        if (delta.y > 0) {
          size_y = Math.round(size * (ascent - descent + 2 * delta.y) / units_per_em );
        }
        if (delta.x > 0) {
          size_x = Math.round(size * (horiz_adv_x + 2 * delta.x) / units_per_em);
        }

        // FIXME: hack to avoid clipped edges by adding 1 pixel on
        // each side and adjusting viewbox accordingly
        if (config.fix_edges) {
          (function (x, y) {
            x = vb.w / size_x;
            y = vb.h / size_y;

            vb.x -= x;
            vb.y -= y;
            vb.w += 2 * x;
            vb.h += 2 * y;

            size_x += 2;
            size_y += 2;
          }());
        }

        // set new size
        if (config.fix_edges || delta.x > 0 || delta.y > 0) {
          r.setSize(size_x, size_y);
        }

        r.setViewBox(vb.x, vb.y, vb.w, vb.h, true);

        // flip y, because svg font's y axis goes upward
        // transform matrix 3x3
        flip_y_matrix = [1, 0, 0, -1, 0, ascent / 2 - descent];
        g.attr({transform: "m" + flip_y_matrix});

        g.show();
        $glyph.find("svg").css({
          "display": "      inline-block",
          "line-height":    size_y + "px",
          "vertical-align": "middle"
        });


        // precalc glyph sizes
        // FIXME: precalc only if glyph goes out of its default box
        glyph_sizes = {};
        _.each(config.preview_glyph_sizes, function (size) {
          glyph_sizes[size] = [
            // width
            Math.round(size * (ascent - descent + 2 * delta.y) / units_per_em),
            // height
            Math.round(size * (horiz_adv_x + 2 * delta.x) / units_per_em)
          ];
        });

        $glyph.find("svg").data("glyph_sizes", glyph_sizes);

        item.glyph_sizes  = glyph_sizes;
        item.svg          = fontomas.util.outerHtml($glyph.find("svg"));
      }, this);

      this.changeGlyphSize(this.glyph_size);

      return this;
    },


    changeGlyphSize: function (new_size) {
      this.$(".fm-glyph-group")
        .removeClass("glyph-size-" + this.glyph_size)
        .addClass("glyph-size-" + new_size);

      this.glyph_size = new_size;

      // FIXME
      if (this.model.get("is_embedded")) {
        return;
      }

      // FIXME: will be removed soon
      this.$(".fm-glyph svg")
        .each(function (i) {
          var $this   = $(this),
              size_x  = $this.data("glyph_sizes")[new_size][0],
              size_y  = $this.data("glyph_sizes")[new_size][1];
          $this.css({
            "width":        size_x + "px",
            "height":       size_y + "px",
            "line-height":  size_y + "px"
          });
        });
    },


    remove: function () {
      this.$el.remove();
      this.trigger("remove", this.model.id);
    },


    close: function (event) {
      event.preventDefault();

      if (this.model.get("is_embedded")) {
        var embedded_id = this.model.get("embedded_id");
        fontomas.embedded_fonts[embedded_id].is_added = false;
        this.trigger("closeEmbeddedFont");
      }

      this.trigger("closeFont", this.model.id);
      this.model.destroy();
    },


    toggleGlyph: function (event) {
      var $target   = $(event.target),
          glyph_id  = parseInt($target.val(), 10),
          data      = this.model.getGlyph(glyph_id);

      data = _.extend(data, {
        font_id:      this.model.id,
        glyph_id:     glyph_id,
        is_embedded:  this.model.get("is_embedded"),
        embedded_id:  this.model.get("embedded_id")
      });

      $target.closest(".fm-glyph")
        .toggleClass("selected", $target.is(":checked"));

      this.trigger("toggleGlyph", data);
    }
  });

}());
