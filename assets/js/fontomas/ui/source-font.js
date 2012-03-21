/*global Fontomas, _, Backbone, Raphael*/

;(function () {
  "use strict";


  var config = Fontomas.config;


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


  Fontomas.views.Font = Backbone.View.extend({
    tagName:  "li",

    iconsize: null,

    events: {
      "click .fm-font-close": "close",
      "click .fm-glyph-id":   "toggleGlyph"
    },


    initialize: function () {
      Fontomas.logger.debug("views.Font.initialize");

      _.bindAll(this);
      this.iconsize = this.options.iconsize;

      this.$el.attr("id", "fm-font-" + this.model.id);
      this.model.on("change",   this.render,  this);
      this.model.on("destroy",  this.remove,  this);
    },


    render: function () {
      Fontomas.logger.debug("views.Font.render el=", this.el);
      var font         = this.model.get("font"),
          ascent       = font.ascent,
          descent      = font.descent,
          units_per_em = font.units_per_em,
          size_string  = $('#fm-icon-size').find("button.active").val(),
          size         = parseInt(size_string, 10) || config.preview_icon_sizes[0],
          font_size_y  = Math.round(size * (ascent - descent) / units_per_em);


      this.$el.html(Fontomas.render('font-item', {
        id:        this.model.id,
        fontname:  this.model.get("fontname")
      }));

      this.$(".fm-glyph-group").addClass(config.icon_size_prefix + size);

      _.each(font.glyphs, function (item, glyph_id) {
        var horiz_adv_x = item.horiz_adv_x || font.horiz_adv_x,
            size_x      = Math.round(size * horiz_adv_x / units_per_em),
            size_y      = font_size_y,
            $glyph      = $(Fontomas.render('glyph-item', item)),
            gd          = $glyph.find('.fm-glyph-div'),
            gd_id       = "fm-font-glyph-" + this.model.id + "-" + glyph_id,
            path        = item.d,
            r,
            g,
            vb,
            delta,
            flip_y_matrix,
            glyph_sizes;

        this.$(".fm-glyph-group").append($glyph);

        $glyph.find(".fm-glyph-id").val(this.model.id + "-" + glyph_id);

        gd.attr("id", gd_id).css({
          "width":        size_x + "px",
          "height":       size_y + "px",
          "margin-left":  "-" + Math.round(size_x/2) + "px",
          "margin-top":   "-" + Math.round(size_y/2) + "px"
        });

        // add svg
        r = new Raphael($glyph.find("#" + gd_id).get(0), size_x, size_y);
        g = r.path(path).attr(config.path_options);

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

          gd.css({
            "width":        size_x + "px",
            "height":       size_y + "px",
            "margin-left":  "-" + Math.round(size_x/2) + "px",
            "margin-top":   "-" + Math.round(size_y/2) + "px"
          });
        }

        r.setViewBox(vb.x, vb.y, vb.w, vb.h, true);

        // flip y, because svg font's y axis goes upward
        // debug: turn flip off
        if (!(Fontomas.debug && Fontomas.debug.noflip)) {
          // transform matrix 3x3
          flip_y_matrix = [1, 0, 0, -1, 0, ascent / 2 - descent];
          g.attr({transform: "m" + flip_y_matrix});
        }

        g.show();

        // precalc glyph sizes
        // FIXME: precalc only if glyph goes out of its default box
        glyph_sizes = {};
        _.each(config.preview_icon_sizes, function (size) {
          glyph_sizes[size] = [
            // width
            Math.round(size * (ascent - descent + 2 * delta.y) / units_per_em),
            // height
            Math.round(size * (horiz_adv_x + 2 * delta.x) / units_per_em)
          ];
        });

        // FIXME: is this the right place?
        gd.data("glyph_sizes", glyph_sizes);
        item.glyph_sizes  = glyph_sizes;
        item.svg          = Fontomas.util.outerHtml($glyph.find("svg"));
      }, this);

      this.changeIconSize(this.iconsize);

      return this;
    },


    changeIconSize: function (size) {
      Fontomas.logger.debug("views.Font.changeIconSize");

      this.iconsize = size;

      this.$('.fm-glyph-group')
        .removeClass(config.icon_size_classes)
        .addClass(config.icon_size_prefix + size);

      // change width/height
      this.$(".fm-glyph-div")
        .each(function (i) {
          var $this   = $(this),
              size_x  = $this.data("glyph_sizes")[size][0],
              size_y  = $this.data("glyph_sizes")[size][1];

          $this.css({
            "width":        size_x + "px",
            "height":       size_y + "px",
            "margin-left":  "-" + Math.round(size_x / 2) + "px",
            "margin-top":   "-" + Math.round(size_y / 2) + "px"
          }).find("svg").css({
            "width":        size_x + "px",
            "height":       size_y + "px"
          });
        });
    },


    remove: function () {
      var self = this;

      Fontomas.logger.debug("views.Font.remove");

      // remove associated html markup
      this.$("input:checkbox:checked").each(function() {
        var glyph_id = $(this).val();
        self.trigger("toggleGlyph", glyph_id, self.model.getGlyph(glyph_id));
      });

      this.$el.remove();
      this.trigger("remove", this.model.id);
    },


    close: function (event) {
      Fontomas.logger.debug("views.Font.close");

      var embedded_id = this.model.get("embedded_id");

      event.preventDefault();

      if (embedded_id !== null) {
        Fontomas.embedded_fonts[embedded_id].is_added = false;
        this.trigger("closeEmbeddedFont");
      }

      this.model.destroy();
    },


    toggleGlyph: function (event) {
      Fontomas.logger.debug("views.Font.toggleGlyph");

      var $target   = $(event.target),
          glyph_id  = $target.attr("value");

      // FIXME
      $target.parent().toggleClass("selected", $target.is(":checked"));

      this.trigger("toggleGlyph", glyph_id, this.model.getGlyph(glyph_id));
    }
  });

}());
