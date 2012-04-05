/*global fontomas, _, Backbone*/


;(function () {
  "use strict";


  fontomas.ui.wizard.result.pane = Backbone.View.extend({
    // Use existing DOM element instead of generating a new one.
    el: '#result > #result-font',

    // Deleagate some event handlers for some child elements.
    events: {
      'click #result-download': 'onDownload'
    },


    // RPOPERRTIES /////////////////////////////////////////////////////////////


    glyph_size: _.first(fontomas.config.preview_glyph_sizes),


    // METHODS /////////////////////////////////////////////////////////////////


    /**
     *  new ui.wizard.result.pane()
     *
     *  View constructor.
     */
    initialize: function () {
      this.$el.addClass("glyph-size-" + this.glyph_size);
      this.model.on('glyph-added', this.addGlyph);
    },


    /**
     *  ui.wizard.result.pane#addGlyph(glyph) -> Void
     *
     *  Creates corresponding view for given glyph.
     *
     *  ##### See Also:
     *
     *  - [[ui.wizard.result.glyph]]
     */
    addGlyph: function (glyph) {
      var view = new fontomas.ui.wizard.result.glyph({
        model:      glyph,
        glyph_size: this.glyph_size
      });

      glyph.on('destroy', function () { view.remove(); });
      this.$el.append(view.el);
    },


    /**
     *  ui.wizard.result.pane#onDownload(event) -> Void
     *
     *  Download button click handler
     */
    onDownload: function (event) {
      event.preventDefault();
      fontomas.util.notify_alert("Not yet implemented. Stay tuned.");
    }
  });

}());
