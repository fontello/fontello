module.exports = Backbone.View.extend({
  // Use existing DOM element instead of generating a new one.
  el: '#result > #result-font',


  // Deleagate some event handlers for some child elements.
  events: {
    'click #result-download': 'onDownload'
  },


  /**
    *  new ui.wizard.result.pane()
    *
    *  View constructor.
    */
  initialize: function () {
    this.model.glyphs.on('add', this.addGlyph, this);
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
    var view = new nodeca.client.fontomas.ui.wizard.result.glyph({model: glyph});
    this.$el.append(view.el);
  },


  /**
    *  ui.wizard.result.pane#onDownload(event) -> Void
    *
    *  Download button click handler
    */
  onDownload: function (event) {
    event.preventDefault();
    nodeca.client.fontomas.util.notify_alert("Not yet implemented. Stay tuned.");
  }
});
