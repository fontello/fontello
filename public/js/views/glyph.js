var Fontomas = (function (Fontomas) {
    "use strict";

    var app = Fontomas.app,
        cfg = Fontomas.cfg,
        env = Fontomas.env,
        debug = Fontomas.debug,
        util = Fontomas.lib.util;

    app.views.Glyph = Backbone.View.extend({
        tagName: "label",
        className: "rearrange-glyph",

        templates: {},

        events: {
        },

        initialize: function () {
            //console.log("app.views.Glyph.initialize");
            _.bindAll(this);
            this.topview = this.options.topview;
            this.templates = this.topview.getTemplates(["genfont_glyph_item"]);
            this.model.bind('change', this.render, this);

            //this.$el.html(this.template(this.model.toJSON()));
            this.$el.html(this.templates.genfont_glyph_item(this.model.toJSON()));
            this.$el.attr("id", "rgl" + this.model.get("num"));
            this.$(cfg.css_class.rg_icon).droppable($.extend(
                {}, cfg.droppable_options, {drop: function (event, ui) {
                console.log("drop");
                var $this=$(this);
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
                    app.mainview.genfontview.updateFont();
                }
            }}));
        },

        render: function () {
            //console.log("app.views.Glyph.render el=", this.el);
            // FIXME: performance
            //this.$el.html(this.template(this.model.toJSON()));
            //this.$el.attr("id", "rgl" + this.model.get("num"));
            this.$(".fm-unicode").val(this.model.get("char"));
            this.$(".rg-top").text(this.model.get("top"));
            this.$(".rg-bottom").text(this.model.get("bottom"));

            return this;
        }
    });

    return Fontomas;
}(Fontomas || {}));
