var Fontomas = (function (_, Backbone, Fontomas) {
  "use strict";

  var config = Fontomas.cfg;

  Fontomas.views.Glyph = Backbone.View.extend({
    tagName:    "label",
    className:  "rearrange-glyph",
    events:     {},

    initialize: function () {
      var self = this;

      //Fontomas.logger.debug("views.Glyph.initialize");

      _.bindAll(this);

      this.topview   = this.options.topview;

      this.model.bind('change', this.render, this);

      //this.$el.html(this.template(this.model.toJSON()));

      this.$el.html(Fontomas.render('genfont-glyph-item', this.model.toJSON()));
      this.$el.attr("id", "rgl" + this.model.get("num"));
    },

    render: function () {
      //Fontomas.logger.debug("views.Glyph.render el=", this.el);
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
}(window._, window.Backbone, Fontomas || {}));
