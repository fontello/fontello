/*global Fontomas, _, Backbone*/

;(function () {
  "use strict";


  var config = Fontomas.config;


  Fontomas.views.Glyph = Backbone.View.extend({
    tagName:    "label",
    className:  "rearrange-glyph",
    events:     {},


    initialize: function () {
      //Fontomas.logger.debug("views.Glyph.initialize");

      _.bindAll(this);

      this.model.on("change",   this.render, this);
      this.model.on("destroy",  this.remove, this);

      this.render();
    },


    render: function () {
      Fontomas.logger.debug("views.Glyph.render el=", this.el);

      var html = Fontomas.render('resultfont-glyph-item', this.model.toJSON());
      this.$el.html(html);

      return this;
    },


    changeIconSize: function (size) {
      var self = this;

      // change width/height
      this.$('.rg-icon')
        .each(function (i) {
          var $this = $(this),
            size_x  = self.model.get("glyph").glyph_sizes[size][0],
            size_y  = self.model.get("glyph").glyph_sizes[size][1];

          //FIXME
          $this.data("glyph_sizes", self.model.get("glyph").glyph_sizes);

          $this.css({
            "width":        "100%",
            "height":       size_y + "px",
            "left":         "0px",
            "margin-left":  "0px",
            "margin-top":   "-" + Math.round(size_y/2) + "px"
          }).find("svg").css({
            width:  size_x + "px",
            height: size_y + "px"
          });
        });
    },


    remove: function () {
      Fontomas.logger.debug("views.Glyph.remove");
      this.$el.remove();
    }
  });

}());
