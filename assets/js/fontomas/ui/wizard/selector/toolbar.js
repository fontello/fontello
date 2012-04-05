/*global fontomas, _, $, Backbone*/

;(function () {
  "use strict";


  var config = fontomas.config;


  function tranferEvents($a, $b, events) {
    $a.on(events.join(' '), $b.trigger);
  }


  fontomas.ui.wizard.selector.toolbar = Backbone.View.extend({
    el: "#selector-toolbar",

    events: {
      "click .fm-font-name":     "onActivateEmbeddedFont",
      "click [data-glyph-size]": "onChangeGlyphSize",
      "change #local-files":     "onChangeLocalFiles"
    },


    initialize: function () {
      _.bindAll(this);

      // transfer click event to hidden files input
      this.$('#browse-local-files').on('click', $('#local-files').trigger);

      this.render();
    },


    onChangeGlyphSize: function (event) {
      event.preventDefault();
      this.trigger("changeGlyphSize", ~~$(event.target).data('glyph-size'));
    },


    onChangeLocalFiles: function (event) {
      event.preventDefault();
      this.trigger("fileUpload", event.target.files);
    },


    onActivateEmbeddedFont: function (event) {
      var id    = $(event.target).data("embedded_id"),
          font  = fontomas.embedded_fonts[id];

      event.preventDefault();

      if (font && !font.is_added) {
        this.trigger("useEmbeddedFont", font);
      }
    },


    render: function () {
      // render icon size buttons
      $('#glyph-size')
        .html(fontomas.render('icon-size', {
          buttons: config.preview_glyph_sizes
        }))
        .find("button:last")
          .addClass("active");

      this.renderEmbededFontsSelector();

      return this;
    },


    renderEmbededFontsSelector: function () {
      $('#fm-use-embedded')
        .html(fontomas.render('use-embedded', {
          options: _.map(fontomas.embedded_fonts, function (item) {
            return {text: item.fontname, disabled: item.is_added};
          })
        }))
        .find('.fm-font-name')
          .each(function (id) {
            $(this).data("embedded_id", id);
          });

      return this;
    }
  });

}());
