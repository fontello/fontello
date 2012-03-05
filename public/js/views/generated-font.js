var Fontomas = (function (Fontomas) {
    var App = Fontomas.App,
        cfg = Fontomas.cfg,
        env = Fontomas.env,
        debug = Fontomas.debug,
        util = Fontomas.lib.util;

    App.Views.GeneratedFont = Backbone.View.extend({
        glyphviews: [],

        events: {
        },

        initialize: function () {
            console.log("Views.GeneratedFont.initialize");
            _.bindAll(this);
            this.topview = this.options.topview;

            this.model.glyphs.each(this.addGlyph);
            this.model.glyphs.bind("add", this.addGlyph, this);

            this.model.bind("change:charset", this.onChangeCharset, this);
            this.model.bind("change:glyph_count",
                this.updateGlyphCount, this);
            this.model.bind("change", this.onChange, this);
        },

        render: function () {
            console.log("Views.GeneratedFont.render");
            _(this.glyphviews).each(function (glyph) {
                $(cfg.id.generated_font).append(glyph.render().el);
            });

            // reset rearrange zone
            $(cfg.id.generated_font)
                .find(".fm-glyph-id").attr({value: "", checked: false});

            return this;
        },

        addGlyph: function (glyph) {
            //console.log("Views.GeneratedFont.addGlyph");
            this.glyphviews.push(new App.Views.Glyph({
                model: glyph,
                topview: this.topview
            }));
        },

        updateGlyphCount: function () {
            console.log("Views.GeneratedFont.updateGlyphCount");
            $(cfg.id.glyph_count).text(this.model.get("glyph_count"));
        },

        onChangeCharset: function (o, value) {
            console.log("Views.GeneratedFont.onChangeCharset", o, value);
            //this.model.setCharset(value);
        },

        onChange: function () {
            console.log("Views.GeneratedFont.onChange");
            if (cfg.live_update) {
                this.updateFont();
                this.updateIconAssignments();
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
            if (!App.main.xml_template)
                return;

            var glyphs = [];
            $(cfg.id.generated_font)
                .find("input:checkbox:checked")
                .each(function () {
                    var $this = $(this),
                        glyph_id = $this.val(),
                        unicode = $this.siblings("input.fm-unicode").val();

                    var font = App.main.fonts.getFont(glyph_id),
                        glyph = App.main.fonts.getGlyph(glyph_id);

                    if (!font || !glyph) {
                        console.log("can't getFont/getGlyph id=", glyph_id);
                        return; 
                    }

                    if (font.units_per_em != cfg.output.units_per_em) {
                        var scale = cfg.output.units_per_em
                            / font.units_per_em;
                        if (glyph.d)
                            glyph.d = this.scalePath(glyph.d, scale);
                        if (glyph.horiz_adv_x)
                            glyph.horiz_adv_x *= scale;
                    }

                    var g = $("<glyph/>");
                    g.attr("unicode", unicode);

                    if (glyph.horiz_adv_x)
                        g.attr("horiz-adv-x", glyph.horiz_adv_x);

                    if (glyph.d)
                        g.attr("d", glyph.d);

                    glyphs.push(util.outerHtml(g));
                });
            $("glyph", App.main.xml_template).remove();
            $("font", App.main.xml_template).append($(glyphs.join("\n")));
            $(cfg.id.font).text(util.xmlToString(App.main.xml_template));
        },

        // update IA's textarea
        updateIconAssignments: function () {
            var self = this;
            var lines = [];
            lines.push(
                "/*",
                "", 
                "Name                       Hex entity          CSS content",
                "======================================================================"
            );

            $(cfg.id.generated_font)
                .find("input:checkbox:checked")
                .each(function () {
                    var $this = $(this);
                    var unicode = $this.siblings("input.fm-unicode").val();
                    var tmp = self.model.toEntityAndCss(unicode);
                    lines.push(
                        util.rpad("n/a", 32)
                        + util.rpad(tmp.entity, 20)
                        + tmp.css
                    );
                });
            lines.push("", "*/");
            $(cfg.id.icon_assignments).text(lines.join("\n"));
        }
    });

    return Fontomas;
})(Fontomas || {});
