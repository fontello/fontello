/*global Fontomas, _, Backbone*/

;(function () {
  "use strict";


  Fontomas.views.Glyph = Backbone.View.extend({
    tagName:    "label",
    className:  "rearrange-glyph",
    events:     {},
    iconsize:   null,

    initialize: function () {
      //Fontomas.logger.debug("views.Glyph.initialize");

      _.bindAll(this);
      this.iconsize = this.options.iconsize;

      this.model.on("change",   this.render, this);
      this.model.on("destroy",  this.remove, this);

      this.render();
    },


    render: function () {
      Fontomas.logger.debug("views.Glyph.render el=", this.el);

      var html = Fontomas.render('resultfont-glyph-item', this.model.toJSON());
      this.$el.html(html);
      this.changeIconSize(this.iconsize);

      return this;
    },


    changeIconSize: function (size) {
      this.iconsize = size;

      var size_x  = this.model.get("glyph").glyph_sizes[size][0],
          size_y  = this.model.get("glyph").glyph_sizes[size][1];

      // change width/height
      this.$('.rg-icon')
        .css({
          "width":        "100%",
          "height":       size_y + "px",
          "left":         "0px",
          "margin-left":  "0px",
          "margin-top":   "-" + Math.round(size_y/2) + "px"
        }).find("svg").css({
          width:  size_x + "px",
          height: size_y + "px"
        });
    },


    remove: function () {
      Fontomas.logger.debug("views.Glyph.remove");
      this.$el.remove();
      this.trigger("remove", this);
    }
  });

}());
