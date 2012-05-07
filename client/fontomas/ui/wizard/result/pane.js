/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/

"use strict";

module.exports = Backbone.View.extend({
  // Use existing DOM element instead of generating a new one.
  el: '#result',


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
    this.$glyphs = this.$('#result-font');

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
    this.$glyphs.append(view.el);
  },


  /**
    *  ui.wizard.result.pane#onDownload(event) -> Void
    *
    *  Download button click handler
    */
  onDownload: function (event) {
    event.preventDefault();
    nodeca.server.fontomas.font.generate(this.model.getFontConfig(), function (err, msg) {
      var font_id = msg.data.id;

      function poll_status() {
        nodeca.server.fontomas.font.status({id: font_id}, function (err, msg) {
          if ('error' === msg.data.status) {
            console.alert('shit happens');
            return;
          }

          if ('enqueued' === msg.data.status) {
            setTimeout(poll_status, 5000);
            return;
          }

          if ('finished' === msg.data.status) {
            var $ifr = $('<iframe></iframe>');

            $ifr.attr('src', msg.data.url);
            $ifr.css('display', 'none');
            $ifr.appendTo(document.body);
          }
        });
      }

      poll_status();
    });
  }
});
