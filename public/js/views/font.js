var fm = (function (fm) {
    var App = fm.App,
        cfg = fm.cfg,
        env = fm.env,
        debug = fm.debug;

    App.Views.Font = Backbone.View.extend({
        tagName:  "li",
        template: _.template($('#fm-font-item-template').html()),
        template_glyph: _.template($('#fm-glyph-item-template').html()),

        events: {
            "click .fm-font-close": "close",
            "click .fm-glyph-id": "toggleGlyph"
        },

        initialize: function () {
            console.log("Views.Font.initialize");
            _.bindAll(this);
            $(this.el).attr('id', "fm-font-"+this.model.id);

            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },

        render: function () {
            console.log("Views.Font.render el=", this.el);

            var font = this.model.get("font");

            var ascent = font.ascent,
                descent = font.descent,
                units_per_em = font.units_per_em;

            var size = parseInt($(cfg.id.icon_size).find("button.active")
                .val()) || 32;
            var font_size_y = Math.round(size * (ascent - descent)
                / units_per_em);

            $(this.el).html(this.template(this.model.toJSON()));
            this.$(".fm-font-anchor")
                .attr("href", "#font-" + this.model.id);
            this.$(".fm-glyph-group").addClass(cfg.icon_size_prefix+size);

            for (var glyph_id in font.glyphs) {
                var item = font.glyphs[glyph_id];

                var horiz_adv_x = item.horiz_adv_x || font.horiz_adv_x;
                var size_x = Math.round(size * horiz_adv_x / units_per_em),
                    size_y = font_size_y;

                var $glyph = $(this.template_glyph(item));

                this.$(".fm-glyph-group").append($glyph);

                $glyph.find(".fm-glyph-id")
                    .val(this.model.id + "-" + glyph_id);
                var gd = $glyph.find(".gd"),
                    gd_id = "fm-font-glyph-"+this.model.id+"-"+glyph_id;
                gd.attr("id", gd_id)
                    .css({
                        width: size_x + "px",
                        height: size_y + "px",
                        "margin-left": "-" + Math.round(size_x/2) + "px",
                        "margin-top": "-" + Math.round(size_y/2) + "px"
                    });

                // add svg
                var dom = $glyph.find("#" + gd_id)[0];
                var path = item.d;
                var r = Raphael(dom, size_x, size_y);
                var g = r.path(path).attr(cfg.path_options);

                // calc delta_x, delta_y
                var bbox = g.getBBox();
                var delta_ascent = Math.max(0, (bbox.y + bbox.height)
                        - ascent),
                    delta_descent = Math.max(0, descent - bbox.y),
                    delta_y = Math.max(delta_ascent, delta_descent);
                var delta_left = Math.max(0, 0 - bbox.x),
                    delta_right = Math.max(0, (bbox.x + bbox.width)
                        - horiz_adv_x),
                    delta_x = Math.max(delta_left, delta_right);

                //debug
                gd.attr("bbox", bbox);

                // SVG's ViewBox
                var vb = {
                    x: 0 - delta_x,
                    y: descent - delta_y,
                    w: horiz_adv_x + 2 * delta_x,
                    h: (ascent - descent) + 2 * delta_y
                };

                // calc new size_y, size_x if glyph goes out of its default
                // box
                if (delta_y > 0) {
                    size_y = Math.round(size * (ascent - descent
                        + 2 * delta_y) / units_per_em );
                }
                if (delta_x > 0) {
                    size_x = Math.round(size * (horiz_adv_x + 2 * delta_x)
                        / units_per_em);
                }

                // FIXME: hack to avoid clipped edges by adding 1 pixel on
                // each side and adjusting viewbox accordingly
                if (cfg.fix_edges) {
                    var delta_xx = vb.w / size_x,
                        delta_yy = vb.h / size_y;

                    vb.x -= delta_xx;
                    vb.y -= delta_yy;
                    vb.w += 2 * delta_xx;
                    vb.h += 2 * delta_yy;

                    size_x += 2;
                    size_y += 2;
                }

                // set new size
                if (cfg.fix_edges || delta_x > 0 || delta_y > 0) {
                    r.setSize(size_x, size_y);

                    gd.css({
                        width: size_x + "px",
                        height: size_y + "px",
                        "margin-left": "-" + Math.round(size_x/2) + "px",
                        "margin-top": "-" + Math.round(size_y/2) + "px"
                    });
                }

                r.setViewBox(vb.x, vb.y, vb.w, vb.h, true);

                // flip y, because svg font's y axis goes upward
                // debug: turn flip off 
                if (!(debug && debug.noflip)) {
                // transform matrix 3x3
                var flip_y_matrix = [1, 0, 0, -1, 0, ascent / 2 - descent];
                g.attr({transform: "m" + flip_y_matrix});
                }

                g.show();

                // precalc glyph sizes
                // FIXME: precalc only if glyph goes out of its default box
                var glyph_sizes = {};
                for (var j in cfg.preview_icon_sizes) {
                    var icon_size = cfg.preview_icon_sizes[j];
                    size_y = Math.round(icon_size * (ascent - descent
                        + 2 * delta_y) / units_per_em);
                    size_x = Math.round(icon_size * (horiz_adv_x
                        + 2 * delta_x) / units_per_em);
                    glyph_sizes[icon_size] = [size_x, size_y];
                }
                // FIXME: is this the right place?
                gd.data("glyph_sizes", glyph_sizes);
            }

            return this;
        },

        remove: function () {
            console.log("Views.Font.remove el=", this.el);
            var self = this;
            // remove associated html markup
            this.$("input:checkbox:checked").each(function() {
                var glyph_id = $(this).val();
                self.removeGlyph(glyph_id);
            });
            $(this.el).remove();
        },

        close: function () {
            console.log("Views.Font.close el=", this.el);

            var embedded_id = this.model.get("embedded_id");
            if (embedded_id !== null) {
                fm_embedded_fonts[embedded_id].is_added = false;
                App.mainview.select_toolbar.updateUseEmbedded();
            }
            this.model.destroy();
        },

        toggleGlyph: function (event) {
            console.log("Views.Font.toggleGlyph event=", event);

            var $target = $(event.target),
                glyph_id = $target.attr("value"),
                is_checked = $target.is(":checked");

            $target.parent().toggleClass("selected", is_checked);

            if (is_checked)
                this.addGlyph(glyph_id);
            else
                this.removeGlyph(glyph_id);
        },

        // add a glyph to the rearrange zone
        addGlyph: function (g_id) {
            console.log("addGlyph g_id=", g_id);

            var checkbox=$(cfg.id.rearrange)
                .find(".fm-glyph-id:not(:checked):first");
            checkbox.attr({value: g_id, checked: true});
            checkbox.parent().addClass("selected");

            var el_id = "#fm-font-glyph-" + g_id;

            var svg = $(el_id).contents().clone(false);
            var icon = checkbox.parent().find(".rg-icon");
            icon.append(svg)
                .data("glyph_sizes", $(el_id).data("glyph_sizes"))
                .draggable(cfg.draggable_options)
                .attr("style", $(el_id).attr("style"))
                .css({width: "100%", left: "0px", "margin-left": "0px"});

            if (App.main.genfont.get("glyph_count") == 0)
                App.mainview.toggleMenu(true);
            App.main.genfont.incCounter();
        },

        // remove a glyph from the rearrange zone
        removeGlyph: function (g_id) {
            console.log("removeGlyph g_id=", g_id);
            var checkbox=$(cfg.id.rearrange)
                .find(".fm-glyph-id:checked[value='"+g_id+"']");
            checkbox.attr({value: "", checked: false});
            checkbox.parent().removeClass("selected");
            checkbox.parent().find(".rg-icon")
                .removeData("glyph_sizes").empty();

            if (App.main.genfont.get("glyph_count") == 1)
                App.mainview.toggleMenu(false);
            App.main.genfont.decCounter();
        }
    });

    return fm;
})(fm || {});
