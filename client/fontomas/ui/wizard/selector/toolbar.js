function tranferEvents($a, $b, events) {
  $a.on(events.join(' '), $b.trigger);
}


module.exports = Backbone.View.extend({
  el: "#selector-toolbar",

  events: {
    "click .fm-font-name":     "onActivateEmbeddedFont",
    "click [data-glyph-size]": "onChangeGlyphSize",
    "change #local-files":     "onChangeLocalFiles"
  },


  initialize: function () {
    _.bindAll(this);

    // render icon size buttons
    $('#glyph-size')
      .html(nodeca.client.fontomas.render('icon-size', {
        buttons: nodeca.client.fontomas.config.preview_glyph_sizes
      }))
      .find("button:last")
        .addClass("active");

    // transfer click event to hidden files input
    this.$('#browse-local-files').on('click', $('#local-files').trigger);
  },


  onChangeGlyphSize: function (event) {
    event.preventDefault();
    this.trigger("change:glyph-size", ~~$(event.target).data('glyph-size'));
  },


  // fired when hidden file input was changed (user selected files)
  onChangeLocalFiles: function (event) {
    event.preventDefault();
    this.trigger("change:local-files", event.target.files);
  },


  onActivateEmbeddedFont: function (event) {
    event.preventDefault();
    this.trigger('click:embedded-font', ~~$(event.target).data("embedded_id"));
  },


  renderEmbededFontsSelector: function () {
    $('#fm-use-embedded')
      .html(nodeca.client.fontomas.render('use-embedded', {
        options: _.map(nodeca.client.fontomas.embedded_fonts, function (item) {
          return {text: item.fullname, disabled: item.is_added};
        })
      }))
      .find('.fm-font-name')
        .each(function (id) {
          $(this).data("embedded_id", id);
        });

    return this;
  }
});
