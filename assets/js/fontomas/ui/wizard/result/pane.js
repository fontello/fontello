/*global fontomas, _, Backbone*/

;(function () {
  "use strict";


  fontomas.ui.wizard.result.pane = Backbone.View.extend({
    el: '#result > #result-font',


    events: {
      'click #result-download': 'download'
    },


    glyph_size: _.first(fontomas.config.preview_glyph_sizes),


    initialize: function () {
      this.$el.addClass("glyph-size-" + this.glyph_size);

      this.model.on('glyph-added', function (glyph) {
        var view = new fontomas.ui.wizard.result.glyph({
          model:      glyph,
          glyph_size: this.glyph_size
        });

        glyph.on('destroy', function () { view.remove(); });
        this.$el.append(view.el);
      }, this);
    },


    download: function (event) {
      event.preventDefault();
      fontomas.util.notify_alert("Not yet implemented. Stay tuned.");
    }
  });

}());
