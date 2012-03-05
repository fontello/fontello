var fm = (function (fm) {
    var App = fm.App,
        cfg = fm.cfg,
        env = fm.env,
        debug = fm.debug,
        util = fm.lib.util;

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

    App.Views.Glyph = Backbone.View.extend({
        tagName: "label",
        className: "rearrange-glyph",
        //template: _.template($('#fm-genfont-glyph-item-template').html()),
        templates: {},

        events: {
        },

        initialize: function () {
            //console.log("Views.Glyph.initialize");
            _.bindAll(this);
            this.topview = this.options.topview;
            this.templates = this.topview.getTemplates(["genfont_glyph_item"]);
            this.model.bind('change', this.render, this);

            //this.$el.html(this.template(this.model.toJSON()));
            this.$el.html(this.templates.genfont_glyph_item(this.model.toJSON()));
            this.$el.attr("id", "rgl" + this.model.get("num"));
            this.$(cfg.class.rg_icon).droppable($.extend(
                {}, cfg.droppable_options, {drop: function (event, ui) {
                console.log("drop");
                $this=$(this);
                var draggable=ui.draggable;
                var g_id=$this.parent().siblings("input:checkbox")
                    .attr("value");
                var d=$this.contents();
                var data = $this.data("glyph_sizes");

                $this.parent().siblings("input:checkbox").attr({value:
                    draggable.parent().siblings("input:checkbox")
                        .attr("value")});
                $this.data("glyph_sizes", draggable.data("glyph_sizes"));
                $this.empty().append(draggable.contents());

                draggable.parent().siblings("input:checkbox")
                    .attr({value: g_id});
                draggable.data("glyph_sizes", data);
                draggable.empty().append(d);

                if (!$this.parent().parent().hasClass("selected")) {
                    $this.parent().parent().addClass("selected");
                    draggable.parent().parent().removeClass("selected");
                    $this.draggable(cfg.draggable_options);
                    draggable.draggable("disable");
                    $this.parent().siblings("input:checkbox")
                        .attr({checked: true});
                    draggable.parent().siblings("input:checkbox")
                        .attr({checked: false});
                }

                if (cfg.live_update) {
                    App.mainview.genfontview.updateFont();
                    App.mainview.genfontview.updateIconAssignments();
                }
            }}));
        },

        render: function () {
            //console.log("Views.Glyph.render el=", this.el);
            // FIXME: performance
            //this.$el.html(this.template(this.model.toJSON()));
            //this.$el.attr("id", "rgl" + this.model.get("num"));
            this.$(".fm-unicode").val(this.model.get("char"));
            this.$(".rg-top").text(this.model.get("top"));
            this.$(".rg-bottom").text(this.model.get("bottom"));

            return this;
        }
    });

    return fm;
})(fm || {});
